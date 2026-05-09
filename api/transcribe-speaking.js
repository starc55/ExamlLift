import fs from "node:fs";
import formidable from "formidable";
import OpenAI from "openai";
import { generateAssessment } from "./ai-feedback.js";

function parseMultipart(req) {
  const form = formidable({
    multiples: false,
    keepExtensions: true,
  });

  return new Promise((resolve, reject) => {
    form.parse(req, (error, fields, files) => {
      if (error) {
        reject(error);
        return;
      }

      resolve({ fields, files });
    });
  });
}

function firstValue(value) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function parseMetadata(rawValue) {
  const value = firstValue(rawValue);

  if (!value) {
    return {};
  }

  try {
    return JSON.parse(String(value));
  } catch {
    return {};
  }
}

function getAudioFile(files) {
  return firstValue(files.audio || files.file || null);
}

function getClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OpenAI API key is not configured.");
  }

  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  let audioFile = null;

  try {
    const { fields, files } = await parseMultipart(req);
    audioFile = getAudioFile(files);
    const metadata = parseMetadata(fields.metadata);

    if (!audioFile?.filepath || !audioFile.size) {
      return res.status(400).json({ error: "Audio file is required." });
    }

    if ((metadata.durationSeconds || 0) < 3) {
      return res.status(400).json({ error: "Audio is too short." });
    }

    const client = getClient();
    const transcription = await client.audio.transcriptions.create({
      file: fs.createReadStream(audioFile.filepath),
      model: "gpt-4o-mini-transcribe",
      language: metadata.language || "en",
      response_format: "json",
    });

    const transcript = String(transcription.text || "").trim();

    if (!transcript || transcript.split(/\s+/).filter(Boolean).length < 3) {
      return res
        .status(400)
        .json({ error: "Audio transcript is too short for assessment." });
    }

    const section =
      metadata.homeworkType === "speaking_homework" ? "homework" : "speaking";
    const payload =
      section === "homework"
        ? {
            ...metadata,
            transcript,
            answer: transcript,
          }
        : {
            ...metadata,
            transcript,
          };

    const assessment = await generateAssessment({ client, section, payload });

    return res.status(200).json({
      transcript,
      ...assessment,
    });
  } catch (error) {
    const message = error?.message || "Failed to transcribe speaking audio.";
    const statusCode =
      message.includes("short") || message.includes("required") ? 400 : 500;

    console.error("Speaking transcription failed:", message);
    return res.status(statusCode).json({ error: message });
  } finally {
    if (audioFile?.filepath) {
      fs.promises.unlink(audioFile.filepath).catch(() => {});
    }
  }
}
