"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";

interface Word {
  rank: number;
  targetWord: string;
  englishWord: string;
  isEnglishToPortuguese?: boolean; // Added optional property
}

interface PracticeWord extends Word {
  correctCount: number;
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
  }, [timer]);

  const handleNext = () => {
    setUserInput("");
    setResult("incorrect");
    setIsEditable(true);
    setTimer(null);

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
      const utterance = new SpeechSynthesisUtterance(nextWord!!.targetWord);
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
      setVocabularyXP(vocabularyXP + 10); // Increment XP
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
    <div className="min-h-screen bg-neutral-900 text-neutral-100 flex flex-col items-center justify-center p-4">
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
  "actions": {
    "show": `}
          <button
            onClick={handleShow}
            className="text-blue-400 hover:underline"
          >
            "Show"
          </button>
          {`
  }
}`}
        </code>
        {timer !== null && (
          <div className="absolute bottom-2 right-2 text-neutral-400 text-xs">
            {`Next in ${Math.ceil(timer)}ms`}
          </div>
        )}
      </pre>
    </div>
  );
}
