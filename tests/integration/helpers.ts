import { Page, expect } from '@playwright/test';

/**
 * Helper functions for integration tests
 */

export class BoardHelper {
  constructor(private page: Page) {}

  /**
   * Make a move by dragging from one square to another
   */
  async dragMove(from: string, to: string): Promise<void> {
    const fromSquare = this.page.locator(`.square-${from}`).first();
    const toSquare = this.page.locator(`.square-${to}`).first();

    await fromSquare.dragTo(toSquare);
    await this.page.waitForTimeout(100);
  }

  /**
   * Make a move by typing UCI notation (for puzzle mode)
   */
  async typeMove(move: string): Promise<void> {
    const input = this.page.locator('[data-testid="puzzle-input"]');
    await input.fill(move);
    await input.press('Enter');
    await this.page.waitForTimeout(100);
  }

  /**
   * Check if a move is highlighted
   */
  async isMoveHighlighted(): Promise<boolean> {
    const highlighted = this.page.locator('[data-testid="highlighted-move"]');
    return await highlighted.isVisible().catch(() => false);
  }

  /**
   * Get the number of analysis lines shown
   */
  async getAnalysisLineCount(): Promise<number> {
    return await this.page.locator('[data-testid="analysis-line"]').count();
  }

  /**
   * Select an engine line by index
   */
  async selectLine(index: number): Promise<void> {
    const line = this.page.locator('[data-testid="analysis-line"]').nth(index);
    await line.click();
    await this.page.waitForTimeout(200);
  }

  /**
   * Check if an explanation is visible
   */
  async isExplanationVisible(): Promise<boolean> {
    const explanation = this.page.locator('[data-testid="line-explanation"]');
    return await explanation.isVisible().catch(() => false);
  }
}

export class ModeHelper {
  constructor(private page: Page) {}

  /**
   * Switch to a specific mode
   */
  async switchToMode(mode: 'analysis' | 'opening' | 'puzzle' | 'endgame' | 'game'): Promise<void> {
    const modeTab = this.page.locator(`[data-testid="mode-${mode}"]`);
    await modeTab.click();
    await this.page.waitForTimeout(300);
  }

  /**
   * Check if mode is active
   */
  async isModeActive(mode: string): Promise<boolean> {
    const modeTab = this.page.locator(`[data-testid="mode-${mode}"]`);
    const isSelected = await modeTab.evaluate((el) =>
      el.classList.contains('active') || el.getAttribute('aria-selected') === 'true'
    );
    return isSelected;
  }

  /**
   * Get current active mode
   */
  async getActiveMode(): Promise<string> {
    const modes = ['analysis', 'opening', 'puzzle', 'endgame', 'game'];
    for (const mode of modes) {
      if (await this.isModeActive(mode)) {
        return mode;
      }
    }
    return 'unknown';
  }
}

export class PuzzleHelper {
  constructor(private page: Page) {}

  /**
   * Submit an answer in puzzle mode
   */
  async submitAnswer(move: string): Promise<void> {
    const input = this.page.locator('[data-testid="puzzle-input"]');
    await input.fill(move);
    await input.press('Enter');
    await this.page.waitForTimeout(200);
  }

  /**
   * Check if puzzle is correct
   */
  async isAnswerCorrect(): Promise<boolean> {
    const feedback = this.page.locator('[data-testid="puzzle-feedback"]');
    const text = await feedback.textContent().catch(() => '');
    return text?.includes('Correct') ?? false;
  }

  /**
   * Click reveal solution button
   */
  async revealSolution(): Promise<void> {
    const button = this.page.locator('[data-testid="reveal-solution"]');
    await button.click();
    await this.page.waitForTimeout(200);
  }

  /**
   * Check if solution is visible
   */
  async isSolutionVisible(): Promise<boolean> {
    const solution = this.page.locator('[data-testid="solution-moves"]');
    return await solution.isVisible().catch(() => false);
  }

  /**
   * Click try again button
   */
  async tryAgain(): Promise<void> {
    const button = this.page.locator('[data-testid="try-again"]');
    await button.click();
    await this.page.waitForTimeout(200);
  }
}

export class NavigationHelper {
  constructor(private page: Page) {}

  /**
   * Press arrow key for navigation
   */
  async pressArrow(direction: 'left' | 'right' | 'up' | 'down'): Promise<void> {
    const keyMap = {
      left: 'ArrowLeft',
      right: 'ArrowRight',
      up: 'ArrowUp',
      down: 'ArrowDown',
    };
    await this.page.keyboard.press(keyMap[direction]);
    await this.page.waitForTimeout(100);
  }

  /**
   * Press arrow right multiple times
   */
  async pressRightArrow(times: number): Promise<void> {
    for (let i = 0; i < times; i++) {
      await this.pressArrow('right');
    }
  }

  /**
   * Press arrow left multiple times
   */
  async pressLeftArrow(times: number): Promise<void> {
    for (let i = 0; i < times; i++) {
      await this.pressArrow('left');
    }
  }
}

/**
 * Wait for element with timeout
 */
export async function waitForElement(
  page: Page,
  selector: string,
  timeout: number = 3000
): Promise<void> {
  await page.waitForSelector(selector, { timeout });
}

/**
 * Get element text content
 */
export async function getElementText(page: Page, selector: string): Promise<string | null> {
  const element = page.locator(selector);
  return await element.textContent().catch(() => null);
}

/**
 * Check if element is visible
 */
export async function isElementVisible(page: Page, selector: string): Promise<boolean> {
  const element = page.locator(selector);
  return await element.isVisible().catch(() => false);
}

/**
 * Click element
 */
export async function clickElement(page: Page, selector: string): Promise<void> {
  await page.click(selector);
  await page.waitForTimeout(100);
}
