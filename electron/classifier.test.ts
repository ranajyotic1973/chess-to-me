// Tests for the regex pre-screen classifier that routes training intents
// without an LLM PASS 1 call.  We test the same patterns used in main.ts.

const openingTrainingSignals = [
  /teach me (an? |the )?opening/i,
  /show me (the |an? )?opening/i,
  /show me (the |a )?\w[\w\s]+ (defense|defence|opening|gambit|attack)/i,
  /i want to (learn|practice) (the |an? )?\w[\w\s]+ (defense|defence|opening|gambit)/i,
  /how does (the |a )?\w[\w\s]+ (defense|defence|opening|gambit) start/i,
  /opening for (white|black)/i,
  /play the \w[\w\s]+ (defense|defence|opening|gambit)/i,
  /teach me (the |a )?\w[\w\s]+ (defense|defence|opening|gambit)/i,
  /teach me (the |a )?(?!.*\bendgame\b)\w[\w\s'-]+/i,
];

const endgameTrainingSignals = [
  /endgame (practice|training|lesson)/i,
  /end game (practice|training|lesson)/i,
  /teach me (a |an )?\w[\w\s]* endgame/i,
  /teach me endgame/i,
  /practice (a |an )?\w[\w\s]* endgame/i,
  /(rook|queen|bishop|knight|pawn) (and|vs?\.?) (rook|queen|bishop|knight|pawn|king) endgame/i,
  /king and (rook|pawn|queen|bishop|knight) endgame/i,
  /how (do i|to) checkmate with (a |an )?\w[\w\s]*/i,
  /\w[\w\s]* (and|vs?\.?) \w[\w\s]* endgame/i,
  /show me (a |an )?\w[\w\s]* endgame/i,
];

function classify(question: string): "opening_training" | "endgame_training" | "other" {
  if (openingTrainingSignals.some(re => re.test(question))) return "opening_training";
  if (endgameTrainingSignals.some(re => re.test(question))) return "endgame_training";
  return "other";
}

describe("regex pre-screen classifier", () => {
  test("'Teach me the Sicilian Defence' → opening_training", () => {
    expect(classify("Teach me the Sicilian Defence")).toBe("opening_training");
  });

  test("'Show me a good opening for white' → opening_training", () => {
    expect(classify("Show me a good opening for white")).toBe("opening_training");
  });

  test("'I want to practice a King and Pawn endgame' → endgame_training", () => {
    expect(classify("I want to practice a King and Pawn endgame")).toBe("endgame_training");
  });

  test("'How do I checkmate with a rook?' → endgame_training", () => {
    expect(classify("How do I checkmate with a rook?")).toBe("endgame_training");
  });

  test("'What is the best move for white here?' → other", () => {
    expect(classify("What is the best move for white here?")).toBe("other");
  });

  test("'Give me a puzzle' → other", () => {
    expect(classify("Give me a puzzle")).toBe("other");
  });

  test("'Endgame practice please' → endgame_training", () => {
    expect(classify("Endgame practice please")).toBe("endgame_training");
  });

  test("'Teach me the Ruy Lopez' → opening_training", () => {
    expect(classify("Teach me the Ruy Lopez")).toBe("opening_training");
  });

  test("'Show me a King and Pawn endgame' → endgame_training", () => {
    expect(classify("Show me a King and Pawn endgame")).toBe("endgame_training");
  });

  test("'Rook and Pawn endgame' → endgame_training", () => {
    expect(classify("Rook and Pawn endgame")).toBe("endgame_training");
  });
});
