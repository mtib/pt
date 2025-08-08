"use client";

import { useState, useEffect, useRef } from "react";
import { fetchExplanation } from "../lib/apiClient";

interface Word {
  rank: number;
  targetWord: string;
  englishWord: string;
  isEnglishToPortuguese?: boolean; // Added optional property
}

interface PracticeWord extends Word {
  correctCount: number;
}

interface Explanation {
  example: string;
  explanation: string;
  definition: string;
  grammar: string;
  facts: string;
  pronunciationIPA: string;
  pronunciationEnglish: string;
  word: string; // Added to match the API response
  englishReference: string; // Added to match the API response
}

export default function Home() {
  const [vocabularyXP, setVocabularyXP] = useState(0);
  const [words, setWords] = useState<Word[]>([]);
  const [practiceWords, setPracticeWords] = useState<PracticeWord[]>([]);
  const [currentWord, setCurrentWord] = useState<Word | PracticeWord | null>(null);
  const [userInput, setUserInput] = useState("");
  const [result, setResult] = useState("incorrect");
  const [isEditable, setIsEditable] = useState(true);
  const [timer, setTimer] = useState<number | null>(null);
  const [dailyStats, setDailyStats] = useState<{ [date: string]: number; }>({});
  const [questionStartTime, setQuestionStartTime] = useState<number | null>(null);
  const [explanation, setExplanation] = useState<Explanation | null>(null);
  const [loadingExplanation, setLoadingExplanation] = useState(false);
  const timerRef = useRef<number | null>(null);

  const getToday = () => new Date().toISOString().split("T")[0];

  useEffect(() => {
    // Load XP, practice list, and daily stats from localStorage
    const storedVocabularyXP = localStorage.getItem("vocabularyXP");
    const storedPracticeWords = localStorage.getItem("practiceWords");
    const storedDailyStats = localStorage.getItem("dailyStats");

    if (storedVocabularyXP) setVocabularyXP(parseInt(storedVocabularyXP, 10));
    if (storedPracticeWords) setPracticeWords(JSON.parse(storedPracticeWords));
    if (storedDailyStats) setDailyStats(JSON.parse(storedDailyStats));

    // Fetch and shuffle vocabulary data
    fetch(
      "https://raw.githubusercontent.com/SMenigat/thousand-most-common-words/refs/heads/master/words/pt.json"
    )
      .then((response) => response.json())
      .then((data) => {
        const shuffledWords = data.words.sort(() => Math.random() - 0.5);
        const firstWord = { ...shuffledWords[0], isEnglishToPortuguese: Math.random() < 0.5 };
        setWords(shuffledWords);
        setCurrentWord(firstWord);

        // Speak the first word if it is Portuguese
        if (!firstWord.isEnglishToPortuguese && firstWord.targetWord) {
          const utterance = new SpeechSynthesisUtterance(firstWord.targetWord);
          utterance.lang = "pt-PT";
          speechSynthesis.speak(utterance);
        }

        // Enable the correct input box for the first word
        setTimeout(() => {
          const portugueseInput = document.querySelector<HTMLInputElement>("input[name='portuguese']");
          const englishInput = document.querySelector<HTMLInputElement>("input[name='english']");

          if (firstWord.isEnglishToPortuguese) {
            if (portugueseInput) {
              portugueseInput.disabled = false;
              portugueseInput.focus();
            }
            if (englishInput) {
              englishInput.disabled = true;
            }
          } else {
            if (englishInput) {
              englishInput.disabled = false;
              englishInput.focus();
            }
            if (portugueseInput) {
              portugueseInput.disabled = true;
            }
          }
        }, 0);
      });
  }, []);

  useEffect(() => {
    // Save XP, practice list, and daily stats to localStorage
    localStorage.setItem("vocabularyXP", vocabularyXP.toString());
    localStorage.setItem("practiceWords", JSON.stringify(practiceWords));
    localStorage.setItem("dailyStats", JSON.stringify(dailyStats));
  }, [vocabularyXP, practiceWords, dailyStats]);

  useEffect(() => {
    const hash = window.location.hash;
    const match = hash.match(/^#auth_(.+)$/);
    if (match) {
      const authKey = match[1];
      localStorage.setItem('auth', authKey);
      window.location.hash = ''; // Clear the hash from the URL
    }
  }, []);

  const handleNext = () => {
    setUserInput("");
    setResult("incorrect");
    setIsEditable(true);
    setTimer(null);
    setQuestionStartTime(Date.now()); // Record the time when the question is presented
    setExplanation(null);

    let nextWord: Word | PracticeWord | null = null;
    let isEnglishToPortuguese = Math.random() < 0.5; // Randomly decide the direction

    const practiceChance = Math.min(0.3 + (practiceWords.length / 20) * 0.7, 1);
    if (practiceWords.length > 0 && Math.random() < practiceChance) {
      const practiceWord = practiceWords[Math.floor(Math.random() * practiceWords.length)];
      isEnglishToPortuguese = practiceWord.isEnglishToPortuguese ?? isEnglishToPortuguese; // Use the same direction as the practice word
      nextWord = { ...practiceWord, isEnglishToPortuguese };
    } else {
      const availableWords = words.filter((word) => !practiceWords.some((pWord) => pWord.rank === word.rank));
      if (availableWords.length > 0) {
        nextWord = { ...availableWords[Math.floor(Math.random() * availableWords.length)], isEnglishToPortuguese };
      }
    }

    if (nextWord) {
      setCurrentWord({ ...nextWord, isEnglishToPortuguese });
    }

    if (!(nextWord?.isEnglishToPortuguese)) {
      const utterance = new SpeechSynthesisUtterance(nextWord?.targetWord || ""); // Removed extra non-null assertion
      utterance.lang = "pt-PT";
      speechSynthesis.speak(utterance);
    }


    // Ensure the input field is auto-focused after setting the next word
    setTimeout(() => {
      const portugueseInput = document.querySelector<HTMLInputElement>("input[name='portuguese']");
      const englishInput = document.querySelector<HTMLInputElement>("input[name='english']");

      if (currentWord?.isEnglishToPortuguese) {
        if (portugueseInput) {
          portugueseInput.focus();
        }
      } else {
        if (englishInput) {
          englishInput.focus();
        }
      }
    }, 0);
  };

  useEffect(() => {
    if (timer === 0) {
      handleNext();
    } else if (timer !== null) {
      const start = performance.now();
      const updateTimer = (timestamp: number) => {
        const elapsed = timestamp - start;
        setTimer((prev) => (prev !== null ? Math.max(0, prev - elapsed) : null));
        if (timerRef.current !== null && timer > 0) {
          timerRef.current = requestAnimationFrame(updateTimer);
        }
      };
      timerRef.current = requestAnimationFrame(updateTimer);
      return () => {
        if (timerRef.current !== null) {
          cancelAnimationFrame(timerRef.current);
        }
      };
    }
  }, [timer, handleNext]); // Added 'handleNext' to dependency array

  const calculateXP = (responseTime: number) => {
    if (responseTime <= 2000) return 10;
    if (responseTime >= 30000) return 1;
    return Math.ceil(10 - ((responseTime - 2000) / 2800));
  };

  const handleInputChange = (value: string) => {
    setUserInput(value);
    const normalize = (str: string) =>
      str
        .normalize("NFD") // Decompose accents
        .replace(/\p{Diacritic}/gu, "") // Remove accents
        .replace(/\s+/g, "") // Remove spaces
        .toLowerCase();

    const correctAnswer = currentWord?.isEnglishToPortuguese
      ? currentWord?.targetWord
      : currentWord?.englishWord;

    if (normalize(value) === normalize(correctAnswer || "")) {
      const responseTime = Date.now() - (questionStartTime || Date.now());
      const xpGained = calculateXP(responseTime);
      setVocabularyXP(vocabularyXP + xpGained); // Increment XP based on response time
      setResult("correct");
      setIsEditable(false);
      setTimer(500);

      const today = getToday();
      setDailyStats((prev) => ({
        ...prev,
        [today]: (prev[today] || 0) + 1,
      }));

      if (currentWord?.isEnglishToPortuguese) {
        const utterance = new SpeechSynthesisUtterance(currentWord!!.targetWord);
        utterance.lang = "pt-PT";
        speechSynthesis.speak(utterance);
      }

      if (currentWord && "correctCount" in currentWord) {
        const updatedPracticeWords = practiceWords
          .map((word) => {
            if (word.rank === currentWord.rank) {
              return { ...word, correctCount: word.correctCount + 1 };
            }
            return word;
          })
          .filter((word) => word.correctCount < 3);

        setPracticeWords(updatedPracticeWords);
      }
    } else {
      setResult("incorrect");
    }
  };

  const handleShow = () => {
    if (currentWord) {
      if (currentWord.isEnglishToPortuguese) {
        setUserInput(currentWord.targetWord);
        const utterance = new SpeechSynthesisUtterance(currentWord.targetWord);
        utterance.lang = "pt-PT";
        speechSynthesis.speak(utterance);
      }
      else {
        setUserInput(currentWord.englishWord);
      }
      setResult("revealed");
      setIsEditable(false);
      setTimer(2000);

      if (!("correctCount" in currentWord)) {
        setPracticeWords((prev) => [
          ...prev,
          { ...currentWord, correctCount: 0 },
        ]);
      }
    }
  };

  const speak = () => {
    if (currentWord) {
      const utterance = new SpeechSynthesisUtterance(
        currentWord.isEnglishToPortuguese ? currentWord.englishWord : currentWord.targetWord
      );
      utterance.lang = currentWord.isEnglishToPortuguese ? "en-US" : "pt-PT";
      speechSynthesis.speak(utterance);
    }
  };

  const speakPt = () => {
    const utterance = new SpeechSynthesisUtterance(
      currentWord?.targetWord
    );
    utterance.lang = "pt-PT";
    speechSynthesis.speak(utterance);
  };

  const authKey = typeof window !== 'undefined' ? localStorage.getItem('auth') : null;

  const explainWord = async () => {
    if (!currentWord || !authKey) return;
    setLoadingExplanation(true);
    setResult("explaining");
    try {
      const data = await fetchExplanation(currentWord.targetWord, currentWord.englishWord, authKey);
      setExplanation({ ...data, word: currentWord.targetWord, englishReference: currentWord.englishWord });
      setResult("explained");
      if (currentWord.isEnglishToPortuguese) {
        setUserInput(currentWord.targetWord);
      } else {
        setUserInput(currentWord.englishWord);
      }
      speakPt();
      if (!("correctCount" in currentWord)) {
        setPracticeWords((prev) => [
          ...prev,
          { ...currentWord, correctCount: 0 },
        ]);
      }
    } catch (error) {
      console.error("Failed to fetch explanation", error);
    } finally {
      setLoadingExplanation(false);
    }
  };

  const today = getToday();
  const yesterday = new Date(new Date().setDate(new Date().getDate() - 1))
    .toISOString()
    .split("T")[0];
  const todayCount = dailyStats[today] || 0;
  const yesterdayCount = dailyStats[yesterday] || 0;
  const diff = todayCount - yesterdayCount;

  const last14Days = Array.from({ length: 14 }, (_, i) => {
    const date = new Date(new Date().setDate(new Date().getDate() - i))
      .toISOString()
      .split("T")[0];
    return dailyStats[date] || 0;
  }).reverse();

  const histogram = last14Days
    .map((count) => {
      const min = Math.min(...last14Days);
      const max = Math.max(...last14Days);
      const range = max - min || 1; // Avoid division by zero
      const normalized = (count - min) / range;

      if (normalized >= 0.8) return "█";
      if (normalized >= 0.6) return "▇";
      if (normalized >= 0.4) return "▆";
      if (normalized >= 0.2) return "▅";
      if (normalized > 0) return "▃";
      return "▁";
    })
    .join("");

  return (
    <div className="bg-neutral-900 text-neutral-100" style={{ display: "flex", flexDirection: "row", width: "100%", height: "100vh" }}>
      <div
        style={{
          flexGrow: 1,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          border: "1px solid #333",
        }}
      >
        <pre className="bg-neutral-800 p-4 rounded-lg shadow-lg text-sm w-full max-w-lg relative">
          <code>
            {`{
  "xp": ${vocabularyXP},
  "word": {
    "portuguese": "`}

            <input
              name="portuguese"
              type="text"
              value={currentWord?.isEnglishToPortuguese ? userInput : currentWord?.targetWord || ""}
              onChange={(e) => handleInputChange(e.target.value)}
              className={`bg-transparent border-b border-neutral-600 focus:outline-none text-neutral-100 ${isEditable && currentWord?.isEnglishToPortuguese ? "focus:border-neutral-400" : "cursor-not-allowed"
                }`}
              disabled={!isEditable || !currentWord?.isEnglishToPortuguese}
            />
            {`",
    "english": "`}

            <input
              name="english"
              type="text"
              value={currentWord?.isEnglishToPortuguese ? currentWord?.englishWord || "" : userInput}
              onChange={(e) => handleInputChange(e.target.value)}
              className={`bg-transparent border-b border-neutral-600 focus:outline-none text-neutral-100 ${isEditable && !currentWord?.isEnglishToPortuguese ? "focus:border-neutral-400" : "cursor-not-allowed"
                }`}
              disabled={!isEditable || currentWord?.isEnglishToPortuguese}
            />
            {`"
  },
  "result": "${result}",
  "dailyStats": {
    "today": ${todayCount},
    "diff": ${diff},
    "histogram": "${histogram}",
    "practiceListLength": ${practiceWords.length}
  },
  "actions": [
    `}
            <button
              onClick={handleShow}
              className="text-blue-400 hover:underline"
            >
              &quot;Show&quot;
            </button>
            {`,\n    `}
            <button
              onClick={handleNext}
              className="text-blue-400 hover:underline cursor-pointer"
            >
              "Next"
            </button>
            {`,\n    `}
            <button
              onClick={speak}
              disabled={!currentWord}
              className="text-blue-400 hover:underline"
            >
              &quot;Speak&quot;
            </button>
            {`,\n    `}
            <button
              onClick={explainWord}
              disabled={!currentWord || loadingExplanation || !authKey}
              className={!currentWord || loadingExplanation || !authKey ? "text-gray-400" : "text-blue-400 hover:underline"}
            >
              &quot;Explain&quot;
            </button>
            {`
  ]
}`}
          </code>
          {timer !== null && (
            <div className="absolute bottom-2 right-2 text-neutral-400 text-xs">
              {`Next in ${Math.ceil(timer)}ms`}
            </div>
          )}
        </pre>
      </div>
      <div
        className="bg-neutral-800"
        style={{
          width: "800px",
          color: "#d4d4d4",
          padding: "1rem",
          borderLeft: "1px solid #333",
          alignSelf: "stretch",
          overflowY: "scroll",
          overflowX: 'hidden',
          fontFamily: "monospace",
        }}
      >
        {(() => {
          if (loadingExplanation) {
            return <div className="text-neutral-400">Loading ...</div>;
          }
          if (explanation) {
            return (
              <div className="text-neutral-100">
                <div className="text-2xl font-bold">
                  <strong>{explanation.word}</strong> <span className="text-neutral-400">({explanation.englishReference})</span>
                </div>
                <div className="text-neutral-400">
                  {explanation.pronunciationIPA} <span>({explanation.pronunciationEnglish})</span>
                </div>
                <div className="mt-4">
                  <strong>Example</strong>
                  <div className="text-sm"><pre style={{ whiteSpace: 'pre-wrap' }}>{explanation.example}</pre></div>
                </div>
                <div className="mt-4">
                  <strong>Explanation</strong>
                  <div className="text-sm"><pre style={{ whiteSpace: 'pre-wrap' }}>{explanation.explanation}</pre></div>
                </div>
                <div className="mt-4">
                  <strong>Definition</strong>
                  <div className="text-sm"><pre style={{ whiteSpace: 'pre-wrap' }}>{explanation.definition}</pre></div>
                </div>
                <div className="mt-4">
                  <strong>Grammar</strong>
                  <div className="text-sm"><pre style={{ whiteSpace: 'pre-wrap' }}>{explanation.grammar}</pre></div>
                </div>
                <div className="mt-4">
                  <strong>Facts</strong>
                  <div className="text-sm"><pre style={{ whiteSpace: 'pre-wrap' }}>{explanation.facts}</pre></div>
                </div>
              </div>
            );
          }
          return (
            <div className="text-neutral-400">
              ✨
            </div>
          );
        })()}
      </div>
    </div>
  );
}
