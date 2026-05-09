import OpenAI from "openai";

const WRITING_INSTRUCTIONS = `Siz ingliz tili writing javoblarini baholaydigan professional o'qituvchisiz.
Javob faqat o'zbek tilida bo'lsin.
Faqat quyidagi formatda yozing:

Umumiy baho:
...

Xatolar:
* ...
* ...

Tavsiyalar:
* ...
* ...

Talablar:
- maksimum 120 so'z
- student-friendly
- professional
- constructive
- grammar, vocabulary, coherence va task response baholansin
- aniq, qisqa va foydali bo'lsin`;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: "OpenAI API key is not configured." });
  }

  const { section, answer } = req.body ?? {};
  const trimmedAnswer = typeof answer === "string" ? answer.trim() : "";

  if (section !== "writing") {
    return res.status(400).json({ error: "Unsupported section." });
  }

  if (!trimmedAnswer) {
    return res.status(400).json({ error: "Answer is required." });
  }

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.responses.create({
      model: "gpt-4o-mini",
      instructions: WRITING_INSTRUCTIONS,
      input: `Section: ${section}

Student answer:
"""${trimmedAnswer}"""`,
    });

    const feedback = response.output_text?.trim();

    if (!feedback) {
      return res.status(502).json({ error: "Empty AI response." });
    }

    return res.status(200).json({ feedback });
  } catch (error) {
    console.error("AI feedback request failed:", error?.message || error);
    return res.status(500).json({ error: "Failed to generate AI feedback." });
  }
}
