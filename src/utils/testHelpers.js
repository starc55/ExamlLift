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

export function scoreVocabularyMatchingTest(words, definitions, answers, maxScore) {
  const definitionMap = new Map(
    definitions.map((definition) => [definition.key, definition.text])
  );

  const incorrectItems = words.reduce((items, word) => {
    if (answers[word.id] === word.correct) {
      return items;
    }

    items.push({
      id: word.id,
      term: word.term,
      selectedKey: answers[word.id] || "",
      selectedText: definitionMap.get(answers[word.id]) || "",
      correctKey: word.correct,
      correctText: definitionMap.get(word.correct) || "",
    });

    return items;
  }, []);

  const totalQuestions = words.length || 1;
  const correctCount = totalQuestions - incorrectItems.length;
  const percent = Math.round((correctCount / totalQuestions) * 100);
  const score = Math.round((percent / 100) * (maxScore || totalQuestions));

  return {
    correctCount,
    totalQuestions,
    percent,
    score,
    maxScore: maxScore || totalQuestions,
    incorrectItems,
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
