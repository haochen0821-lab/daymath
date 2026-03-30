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
          hint: "數字寶寶們手牽手，加起來不超過 10 喔！",
          generate() {
            const a = rand(1, 9);
            const b = rand(1, 9 - a); // 確保和 <= 9，不進位
            return { a, b, answer: a + b };
          },
        },
        2: {
          name: "小鹿",
          description: "20 以內加法，不進位",
          hint: "個位數乖乖的，加在一起不會超過 9！",
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
          description: "20 以內加法，涉及進位",
          hint: "個位數加在一起會『衝破 10』，要小心進位喔！",
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
          hint: "兩個大數字的對決！你是心算小高手！",
          generate() {
            const a = rand(10, 99);
            const b = rand(10, 99);
            return { a, b, answer: a + b };
          },
        },
      },
    },

    subtraction: {
      symbol: "−",
      levels: {
        1: {
          name: "小兔子",
          description: "10 以內減法",
          hint: "小數字慢慢減，答案一定是正數喔！",
          generate() {
            const a = rand(2, 10);
            const b = rand(1, a - 1);
            return { a, b, answer: a - b };
          },
        },
        2: {
          name: "小鹿",
          description: "20 以內減法，不借位",
          hint: "個位數夠減，不用跟十位數借！",
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
          description: "20 以內減法，涉及借位",
          hint: "個位數不夠減，要跟十位數『借 10』來幫忙！",
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
          hint: "兩位數大對決！穩穩算，你做得到！",
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
          description: "2, 5, 10 的乘法倍數",
          hint: "2、5、10 是最好的朋友，先從它們開始！",
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
          hint: "背熟九九乘法表，你就是乘法小達人！",
          generate() {
            const a = rand(1, 9);
            const b = rand(1, 9);
            return { a, b, answer: a * b };
          },
        },
        3: {
          name: "小獅子",
          description: "雙位數乘以個位數",
          hint: "大數字乘小數字，拆開來算更簡單！",
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
          description: "被除數 20 以內，可整除",
          hint: "把東西平均分給大家，剛好分完不會剩！",
          generate() {
            const b = rand(2, 10);
            const answer = rand(1, Math.floor(20 / b));
            const a = b * answer;
            return { a, b, answer };
          },
        },
        2: {
          name: "小鹿",
          description: "被除數 100 以內，九九乘法逆運算",
          hint: "想想九九乘法反過來，答案就出來了！",
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
