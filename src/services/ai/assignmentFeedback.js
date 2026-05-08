import { buildFeedback } from "./feedbackUtils";

export function getAssignmentFeedback({
  note = "",
  fileName = "",
  contentTitle = "",
  taskTitle = "",
}) {
  const trimmedNote = note.trim();
  const wordCount = trimmedNote.split(/\s+/).filter(Boolean).length;
  const hasFile = Boolean(fileName);
  const lessonLabel = taskTitle || contentTitle || "lesson task";

  const scoreLine =
    wordCount >= 35 && hasFile
      ? `Topshiriq mazmuni ${lessonLabel} uchun yaxshi tayyorlangan. Yozma izoh va biriktirilgan fayl bir-birini qo'llab-quvvatlayapti.`
      : wordCount >= 20
      ? `Topshiriq ${lessonLabel} bo'yicha yuborilgan, lekin izoh yoki qo'shimcha dalillarni yanada kuchaytirish mumkin.`
      : `Topshiriq teacher panelga yuborildi, ammo AI nazarida izoh juda qisqa va ishning sifati haqida to'liq tasavvur bermaydi.`;

  const mistakes = [];

  if (wordCount < 20) {
    mistakes.push("Yuborilgan note juda qisqa yoki umumiy yozilgan.");
  } else {
    mistakes.push(
      "Ba'zi fikrlar aniq misol yoki detail bilan kuchaytirilishi mumkin."
    );
  }

  if (!hasFile) {
    mistakes.push(
      "Fayl biriktirilmagan, shu sababli teacher faqat qisqa note asosida ko'radi."
    );
  } else {
    mistakes.push(
      "Biriktirilgan fayl mazmuni AI tomonidan chuqur tekshirilmaydi, asosan note va submit context baholandi."
    );
  }

  const suggestions = hasFile
    ? [
        "Keyingi safar note ichida faylda aynan nimalar borligini 1-2 jumlada aniq yozing.",
        "Asosiy grammar yoki vocabulary nuqtalaringizni qisqa bullet tarzida ta'kidlang.",
      ]
    : [
        "Agar imkon bo'lsa, topshiriqqa mos fayl yoki rasm ham biriktiring.",
        "Teacher uchun qisqa maqsad, ishlatilgan mavzu va qiyin bo'lgan joyni note ichida ko'rsating.",
      ];

  return buildFeedback({
    scoreLine,
    mistakes,
    suggestions,
    labels: {
      overall: "Umumiy baho:",
      mistakesTitle: "Xatolar:",
      suggestionsTitle: "Tavsiyalar:",
    },
  });
}
