/**
 * 難度分級題目產生器 (Question Generator)
 *
 * 支援四則運算，每種運算有多個難度等級。
 * 每個等級定義數字範圍與額外約束（進位、借位、整除等）。
 */

const QuestionGenerator = (() => {
  // --- 工具函式 ---
  const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

  // 判斷加法是否進位（個位數相加 >= 10）
  const hasCarry = (a, b) => (a % 10) + (b % 10) >= 10;

  // 判斷減法是否借位（被減數個位 < 減數個位）
  const hasBorrow = (a, b) => (a % 10) < (b % 10);

  // --- 難度定義 ---
  const OPERATIONS = {
    addition: {
      symbol: "+",
      levels: {
        1: {
          name: "小兔子",
          description: "10 以內個位數相加",
          hint: "像 3 + 5、2 + 4 這種，兩個小數字加起來，答案不超過 10",
          example: "3 + 5 = 8",
          generate() {
            const a = rand(1, 9);
            const b = rand(1, 9 - a); // 確保和 <= 9，不進位
            return { a, b, answer: a + b };
          },
        },
        2: {
          name: "小鹿",
          description: "20 以內加法，不進位",
          hint: "像 12 + 5、11 + 3 這種，個位數加起來不超過 9，不需要進位",
          example: "12 + 5 = 17",
          generate() {
            let a, b;
            do {
              a = rand(10, 18);
              b = rand(1, 19 - a);
            } while (hasCarry(a, b) || a + b > 20);
            return { a, b, answer: a + b };
          },
        },
        3: {
          name: "小獅子",
          description: "20 以內加法，需要進位",
          hint: "像 8 + 7、6 + 9 這種，個位數加起來超過 10，要進位到十位數",
          example: "8 + 7 = 15",
          generate() {
            let a, b;
            do {
              a = rand(2, 14);
              b = rand(2, 18 - a);
            } while (!hasCarry(a, b) || a + b > 20);
            return { a, b, answer: a + b };
          },
        },
        4: {
          name: "小龍",
          description: "兩位數加法",
          hint: "像 23 + 45、67 + 18 這種，兩個兩位數相加，可能需要進位",
          example: "23 + 45 = 68",
          generate() {
            const a = rand(10, 99);
            const b = rand(10, 99);
            return { a, b, answer: a + b };
          },
        },
      },
    },

    subtraction: {
      symbol: "\u2212",
      levels: {
        1: {
          name: "小兔子",
          description: "10 以內減法",
          hint: "像 7 \u2212 3、9 \u2212 5 這種，10 以內的數字互減",
          example: "7 \u2212 3 = 4",
          generate() {
            const a = rand(2, 10);
            const b = rand(1, a - 1);
            return { a, b, answer: a - b };
          },
        },
        2: {
          name: "小鹿",
          description: "20 以內減法，不借位",
          hint: "像 18 \u2212 6、15 \u2212 3 這種，個位數夠減，不需要借位",
          example: "18 \u2212 6 = 12",
          generate() {
            let a, b;
            do {
              a = rand(11, 20);
              b = rand(1, a - 1);
            } while (hasBorrow(a, b) || b >= 10);
            return { a, b, answer: a - b };
          },
        },
        3: {
          name: "小獅子",
          description: "20 以內減法，需要借位",
          hint: "像 15 \u2212 8、13 \u2212 7 這種，個位不夠減要跟十位借 1 變成 10",
          example: "15 \u2212 8 = 7",
          generate() {
            let a, b;
            do {
              a = rand(11, 20);
              b = rand(2, a - 1);
            } while (!hasBorrow(a, b));
            return { a, b, answer: a - b };
          },
        },
        4: {
          name: "小龍",
          description: "兩位數減法",
          hint: "像 73 \u2212 28、95 \u2212 47 這種，兩個兩位數互減，可能需要借位",
          example: "73 \u2212 28 = 45",
          generate() {
            const a = rand(20, 99);
            const b = rand(10, a - 1);
            return { a, b, answer: a - b };
          },
        },
      },
    },

    multiplication: {
      symbol: "×",
      levels: {
        1: {
          name: "小兔子",
          description: "2、5、10 的倍數",
          hint: "只會出現 \u00D72、\u00D75、\u00D710，像 2\u00D73、5\u00D76、10\u00D74 這種最簡單的乘法",
          example: "5 \u00D7 6 = 30",
          generate() {
            const multipliers = [2, 5, 10];
            const a = multipliers[rand(0, 2)];
            const b = rand(1, 10);
            return { a, b, answer: a * b };
          },
        },
        2: {
          name: "小鹿",
          description: "九九乘法表",
          hint: "1\u00D71 到 9\u00D79 的九九乘法，像 7\u00D78、4\u00D76 這種",
          example: "7 \u00D7 8 = 56",
          generate() {
            const a = rand(1, 9);
            const b = rand(1, 9);
            return { a, b, answer: a * b };
          },
        },
        3: {
          name: "小獅子",
          description: "兩位數 \u00D7 一位數",
          hint: "像 12\u00D74、35\u00D73 這種，可以拆成十位和個位分開乘再加起來",
          example: "12 \u00D7 4 = 48",
          generate() {
            const a = rand(11, 99);
            const b = rand(2, 9);
            return { a, b, answer: a * b };
          },
        },
      },
    },

    division: {
      symbol: "÷",
      levels: {
        1: {
          name: "小兔子",
          description: "20 以內的除法",
          hint: "像 12\u00F73、20\u00F75 這種，答案都是整數，不會有餘數",
          example: "12 \u00F7 3 = 4",
          generate() {
            const b = rand(2, 10);
            const answer = rand(1, Math.floor(20 / b));
            const a = b * answer;
            return { a, b, answer };
          },
        },
        2: {
          name: "小鹿",
          description: "100 以內的除法",
          hint: "像 56\u00F77、72\u00F78 這種，其實就是九九乘法反過來問",
          example: "56 \u00F7 7 = 8",
          generate() {
            const b = rand(2, 9);
            const answer = rand(2, 9);
            const a = b * answer;
            return { a, b, answer };
          },
        },
      },
    },
  };

  // --- 公開 API ---

  /**
   * 產生一道題目
   * @param {string} operation - 運算類型 (addition|subtraction|multiplication|division)
   * @param {number} level - 難度等級
   * @returns {{ a: number, b: number, answer: number, symbol: string, display: string }}
   */
  function generate(operation, level) {
    const op = OPERATIONS[operation];
    if (!op) throw new Error(`Unknown operation: ${operation}`);

    const lvl = op.levels[level];
    if (!lvl) throw new Error(`Unknown level ${level} for ${operation}`);

    const { a, b, answer } = lvl.generate();
    const display = `${a} ${op.symbol} ${b}`;

    return { a, b, answer, symbol: op.symbol, display, operation, level };
  }

  /**
   * 取得所有運算與難度的 metadata
   * @returns {Object} 結構化的運算/難度清單
   */
  function getOperations() {
    const result = {};
    for (const [key, op] of Object.entries(OPERATIONS)) {
      result[key] = {
        symbol: op.symbol,
        levels: {},
      };
      for (const [lvl, def] of Object.entries(op.levels)) {
        result[key].levels[lvl] = {
          name: def.name,
          description: def.description,
          hint: def.hint,
          example: def.example,
        };
      }
    }
    return result;
  }

  /**
   * 取得指定運算的最大難度
   */
  function getMaxLevel(operation) {
    const op = OPERATIONS[operation];
    return op ? Math.max(...Object.keys(op.levels).map(Number)) : 0;
  }

  return { generate, getOperations, getMaxLevel };
})();
