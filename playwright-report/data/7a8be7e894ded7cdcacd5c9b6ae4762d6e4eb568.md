# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: redux-integration.spec.ts >> Redux Integration - Board Moves and Line Selection >> should dispatch selectEngineLine thunk with full payload when line is selected
- Location: tests\integration\redux-integration.spec.ts:66:7

# Error details

```
TimeoutError: locator.click: Timeout 10000ms exceeded.
Call log:
  - waiting for locator('[data-testid="mode-analysis"]')

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - generic [ref=e4]:
    - generic [ref=e5]:
      - heading "Chess To Me" [level=6] [ref=e6]
      - generic [ref=e7]: v1.6.0
    - generic [ref=e8]:
      - button "minimize" [ref=e9] [cursor=pointer]:
        - img [ref=e10]
      - button "maximize" [ref=e12] [cursor=pointer]:
        - img [ref=e13]
      - button "close" [ref=e15] [cursor=pointer]:
        - img [ref=e16]
  - generic [ref=e18]:
    - generic "Profile" [ref=e20] [cursor=pointer]:
      - generic [ref=e22]: "?"
    - generic [ref=e24]:
      - generic [ref=e25]:
        - generic [ref=e26]:
          - 'generic "Evaluation: 0.0" [ref=e27]':
            - generic:
              - paragraph: "0.0"
          - generic [ref=e33]:
            - generic [ref=e36]: "8"
            - generic [ref=e46]: "7"
            - generic [ref=e56]: "6"
            - generic [ref=e66]: "5"
            - generic [ref=e76]: "4"
            - generic [ref=e86]: "3"
            - generic [ref=e96]: "2"
            - generic [ref=e104]:
              - generic [ref=e105]:
                - generic [ref=e106]: a
                - generic [ref=e107]: "1"
              - generic [ref=e109]: b
              - generic [ref=e111]: c
              - generic [ref=e113]: d
              - generic [ref=e115]: e
              - generic [ref=e117]: f
              - generic [ref=e119]: g
              - generic [ref=e121]: h
          - generic [ref=e122]:
            - button "view logs" [ref=e123] [cursor=pointer]:
              - img [ref=e124]
            - button "Reset board, clear chat, and return to analysis mode" [ref=e126] [cursor=pointer]:
              - img [ref=e127]
        - generic [ref=e130]:
          - button "open import controls" [ref=e131] [cursor=pointer]:
            - img [ref=e132]
          - button "open board editor" [ref=e134] [cursor=pointer]:
            - img [ref=e135]
          - button "advanced analysis" [disabled]:
            - img
      - generic [ref=e139]:
        - paragraph [ref=e141]: Ask a question to see the response here...
        - generic [ref=e144]:
          - textbox "e.g. What plans should White consider here?" [ref=e145]
          - group
        - generic [ref=e146]:
          - generic [ref=e147]:
            - button "Ask Ollama" [ref=e148] [cursor=pointer]
            - button "clear chat" [ref=e149] [cursor=pointer]:
              - img [ref=e150]
          - button "open settings" [ref=e152] [cursor=pointer]:
            - img [ref=e153]
  - generic [ref=e155]:
    - generic [ref=e156]:
      - paragraph [ref=e158]: ANALYSIS
      - paragraph [ref=e162]: LC0
      - paragraph [ref=e165]: ollama
    - paragraph [ref=e168]: Ready
    - generic [ref=e171]:
      - paragraph [ref=e172]: "Puzzles:"
      - generic [ref=e173] [cursor=pointer]: Lichess
      - paragraph [ref=e174]: ·
      - paragraph [ref=e175]: "Games:"
      - generic [ref=e176] [cursor=pointer]: Lumbrasgigabase
```

# Test source

```ts
  1   | import { Page, expect } from '@playwright/test';
  2   | 
  3   | /**
  4   |  * Helper functions for integration tests
  5   |  */
  6   | 
  7   | export class BoardHelper {
  8   |   constructor(private page: Page) {}
  9   | 
  10  |   /**
  11  |    * Make a move by dragging from one square to another
  12  |    */
  13  |   async dragMove(from: string, to: string): Promise<void> {
  14  |     const fromSquare = this.page.locator(`.square-${from}`).first();
  15  |     const toSquare = this.page.locator(`.square-${to}`).first();
  16  | 
  17  |     await fromSquare.dragTo(toSquare);
  18  |     await this.page.waitForTimeout(100);
  19  |   }
  20  | 
  21  |   /**
  22  |    * Make a move by typing UCI notation (for puzzle mode)
  23  |    */
  24  |   async typeMove(move: string): Promise<void> {
  25  |     const input = this.page.locator('[data-testid="puzzle-input"]');
  26  |     await input.fill(move);
  27  |     await input.press('Enter');
  28  |     await this.page.waitForTimeout(100);
  29  |   }
  30  | 
  31  |   /**
  32  |    * Check if a move is highlighted
  33  |    */
  34  |   async isMoveHighlighted(): Promise<boolean> {
  35  |     const highlighted = this.page.locator('[data-testid="highlighted-move"]');
  36  |     return await highlighted.isVisible().catch(() => false);
  37  |   }
  38  | 
  39  |   /**
  40  |    * Get the number of analysis lines shown
  41  |    */
  42  |   async getAnalysisLineCount(): Promise<number> {
  43  |     return await this.page.locator('[data-testid="analysis-line"]').count();
  44  |   }
  45  | 
  46  |   /**
  47  |    * Select an engine line by index
  48  |    */
  49  |   async selectLine(index: number): Promise<void> {
  50  |     const line = this.page.locator('[data-testid="analysis-line"]').nth(index);
  51  |     await line.click();
  52  |     await this.page.waitForTimeout(200);
  53  |   }
  54  | 
  55  |   /**
  56  |    * Check if an explanation is visible
  57  |    */
  58  |   async isExplanationVisible(): Promise<boolean> {
  59  |     const explanation = this.page.locator('[data-testid="line-explanation"]');
  60  |     return await explanation.isVisible().catch(() => false);
  61  |   }
  62  | }
  63  | 
  64  | export class ModeHelper {
  65  |   constructor(private page: Page) {}
  66  | 
  67  |   /**
  68  |    * Switch to a specific mode
  69  |    */
  70  |   async switchToMode(mode: 'analysis' | 'opening' | 'puzzle' | 'endgame' | 'game'): Promise<void> {
  71  |     const modeTab = this.page.locator(`[data-testid="mode-${mode}"]`);
> 72  |     await modeTab.click();
      |                   ^ TimeoutError: locator.click: Timeout 10000ms exceeded.
  73  |     await this.page.waitForTimeout(300);
  74  |   }
  75  | 
  76  |   /**
  77  |    * Check if mode is active
  78  |    */
  79  |   async isModeActive(mode: string): Promise<boolean> {
  80  |     const modeTab = this.page.locator(`[data-testid="mode-${mode}"]`);
  81  |     const isSelected = await modeTab.evaluate((el) =>
  82  |       el.classList.contains('active') || el.getAttribute('aria-selected') === 'true'
  83  |     );
  84  |     return isSelected;
  85  |   }
  86  | 
  87  |   /**
  88  |    * Get current active mode
  89  |    */
  90  |   async getActiveMode(): Promise<string> {
  91  |     const modes = ['analysis', 'opening', 'puzzle', 'endgame', 'game'];
  92  |     for (const mode of modes) {
  93  |       if (await this.isModeActive(mode)) {
  94  |         return mode;
  95  |       }
  96  |     }
  97  |     return 'unknown';
  98  |   }
  99  | }
  100 | 
  101 | export class PuzzleHelper {
  102 |   constructor(private page: Page) {}
  103 | 
  104 |   /**
  105 |    * Submit an answer in puzzle mode
  106 |    */
  107 |   async submitAnswer(move: string): Promise<void> {
  108 |     const input = this.page.locator('[data-testid="puzzle-input"]');
  109 |     await input.fill(move);
  110 |     await input.press('Enter');
  111 |     await this.page.waitForTimeout(200);
  112 |   }
  113 | 
  114 |   /**
  115 |    * Check if puzzle is correct
  116 |    */
  117 |   async isAnswerCorrect(): Promise<boolean> {
  118 |     const feedback = this.page.locator('[data-testid="puzzle-feedback"]');
  119 |     const text = await feedback.textContent().catch(() => '');
  120 |     return text?.includes('Correct') ?? false;
  121 |   }
  122 | 
  123 |   /**
  124 |    * Click reveal solution button
  125 |    */
  126 |   async revealSolution(): Promise<void> {
  127 |     const button = this.page.locator('[data-testid="reveal-solution"]');
  128 |     await button.click();
  129 |     await this.page.waitForTimeout(200);
  130 |   }
  131 | 
  132 |   /**
  133 |    * Check if solution is visible
  134 |    */
  135 |   async isSolutionVisible(): Promise<boolean> {
  136 |     const solution = this.page.locator('[data-testid="solution-moves"]');
  137 |     return await solution.isVisible().catch(() => false);
  138 |   }
  139 | 
  140 |   /**
  141 |    * Click try again button
  142 |    */
  143 |   async tryAgain(): Promise<void> {
  144 |     const button = this.page.locator('[data-testid="try-again"]');
  145 |     await button.click();
  146 |     await this.page.waitForTimeout(200);
  147 |   }
  148 | }
  149 | 
  150 | export class NavigationHelper {
  151 |   constructor(private page: Page) {}
  152 | 
  153 |   /**
  154 |    * Press arrow key for navigation
  155 |    */
  156 |   async pressArrow(direction: 'left' | 'right' | 'up' | 'down'): Promise<void> {
  157 |     const keyMap = {
  158 |       left: 'ArrowLeft',
  159 |       right: 'ArrowRight',
  160 |       up: 'ArrowUp',
  161 |       down: 'ArrowDown',
  162 |     };
  163 |     await this.page.keyboard.press(keyMap[direction]);
  164 |     await this.page.waitForTimeout(100);
  165 |   }
  166 | 
  167 |   /**
  168 |    * Press arrow right multiple times
  169 |    */
  170 |   async pressRightArrow(times: number): Promise<void> {
  171 |     for (let i = 0; i < times; i++) {
  172 |       await this.pressArrow('right');
```