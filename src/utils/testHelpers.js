export function scoreMcqTest(questions, answers, maxScore) {
  const correctCount = questions.reduce((total, question) => {
    return total + (answers[question.id] === question.correctAnswer ? 1 : 0);
  }, 0);

  const totalQuestions = questions.length || 1;
  const percent = Math.round((correctCount / totalQuestions) * 100);
  const score = Math.round((percent / 100) * (maxScore || totalQuestions));

  return {
    correctCount,
    totalQuestions,
    percent,
    score,
    maxScore: maxScore || totalQuestions,
  };
}

export function getAttemptStatus(percent) {
  if (percent >= 80) {
    return "Excellent";
  }

  if (percent >= 60) {
    return "Developing";
  }

  return "Needs support";
}
