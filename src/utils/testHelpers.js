export function scoreMcqTest(questions, answers, maxScore) {
  const wrongAnswers = questions.reduce((items, question) => {
    const studentAnswer = answers[question.id] || "";

    if (studentAnswer === question.correctAnswer) {
      return items;
    }

    items.push({
      id: question.id,
      question: question.prompt,
      studentAnswer,
      correctAnswer: question.correctAnswer,
      grammarTopic: question.grammarTopic || "",
    });

    return items;
  }, []);

  const totalQuestions = questions.length || 1;
  const correctCount = totalQuestions - wrongAnswers.length;
  const percent = Math.round((correctCount / totalQuestions) * 100);
  const score = Math.round((percent / 100) * (maxScore || totalQuestions));

  return {
    correctCount,
    totalQuestions,
    percent,
    percentage: percent,
    score,
    total: maxScore || totalQuestions,
    maxScore: maxScore || totalQuestions,
    answeredCount: Object.values(answers).filter(Boolean).length,
    wrongAnswers,
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
  const wrongAnswers = incorrectItems.map((item) => ({
    term: item.term,
    studentAnswer: item.selectedKey || "",
    correctAnswer: item.correctKey,
    correctDefinition: item.correctText,
  }));

  return {
    correctCount,
    totalQuestions,
    percent,
    percentage: percent,
    score,
    total: maxScore || totalQuestions,
    maxScore: maxScore || totalQuestions,
    incorrectItems,
    wrongAnswers,
  };
}

export function areAllQuestionsAnswered(questions, answers) {
  return questions.every((question) => Boolean(answers[question.id]));
}

export function areAllVocabularyAnswersSelected(words, answers) {
  return words.every((word) => Boolean(answers[word.id]));
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
