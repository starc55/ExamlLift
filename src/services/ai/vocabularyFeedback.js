import { buildFeedback } from "./feedbackUtils";

export function getVocabularyFeedback({ percent, incorrectItems = [] }) {
  const scoreLine =
    percent === 100
      ? "Barcha vocabulary va definition juftliklari to'g'ri topildi."
      : percent >= 80
        ? "Vocabulary matching natijasi yaxshi, lekin ayrim juftliklarda aniqlikni oshirish kerak."
        : "Vocabulary matching bo'limida qo'shimcha mashq qilish tavsiya etiladi.";

  const mistakes =
    incorrectItems.length === 0
      ? ["Juftliklarni tanlashda izchillik saqlandi."]
      : [
          `${incorrectItems.length} ta juftlikda mos definition noto'g'ri tanlandi.`,
          "Ayrim military terms o'xshash ma'nolar bilan chalkashdi.",
        ];

  const suggestions =
    percent >= 80
      ? [
          "Terminlarni definition bilan birga qisqa flashcard formatida takrorlang.",
          "O'xshash military vocabulary juftliklarini bir-biridan farqlashga e'tibor bering.",
        ]
      : [
          "Har bir term uchun bitta kalit so'z yoki context yozib yodlang.",
          "Definitiondagi asosiy action word'larni ajratib, keyin matchingni qayta bajaring.",
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
