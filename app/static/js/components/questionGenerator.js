/**
 * 難度分級題目產生器 (Question Generator)
 *
 * 支援四則運算，每種運算有多個難度等級。
 * 低階維持個位 / 兩位數的基礎練習，高階加入：
 *   - 多位數運算（百位、千位）
 *   - 三個數連續運算（三個個位 → 三個十位 → 三個百位）
 *
 * 每個 level 的 generate() 可回傳：
 *   { a, b, answer }                → 由 symbol 自動組出 "a ○ b"
 *   { display, answer }             → 自訂題目字串（多運算元用）
 */

const QuestionGenerator = (() => {
  // --- 工具函式 ---
  const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

  // 判斷加法是否進位（個位數相加 >= 10）
  const hasCarry = (a, b) => (a % 10) + (b % 10) >= 10;

  // 判斷減法是否借位（被減數個位 < 減數個位）
  const hasBorrow = (a, b) => (a % 10) < (b % 10);

  // 三運算元題目字串： "a ○ b ○ c"
  const join3 = (nums, sym) => nums.join(" " + sym + " ");

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
        5: {
          name: "獨角獸",
          description: "三位數相加，和不到 1000",
          hint: "兩個三位數相加，加起來還不到一千，像 234 + 521",
          example: "234 + 521 = 755",
          generate() {
            const a = rand(100, 899);
            const b = rand(100, 999 - a); // 保證 b >= 100 且 和 <= 999
            return { a, b, answer: a + b };
          },
        },
        6: {
          name: "大象王",
          description: "三位數相加，和是一千多",
          hint: "兩個三位數相加，會進位到千位，答案是 1000 多，像 678 + 555",
          example: "678 + 555 = 1233",
          generate() {
            let a, b;
            do {
              a = rand(100, 999);
              b = rand(100, 999);
            } while (a + b < 1000 || a + b > 1999);
            return { a, b, answer: a + b };
          },
        },
        7: {
          name: "暴龍",
          description: "千位數相加，和到 2000 以上",
          hint: "兩個一千多的數字相加，答案會超過 2000，像 1234 + 1567",
          example: "1234 + 1567 = 2801",
          generate() {
            let a, b;
            do {
              a = rand(1000, 1999);
              b = rand(1000, 1999);
            } while (a + b < 2000);
            return { a, b, answer: a + b };
          },
        },
        8: {
          name: "巨鯨",
          description: "三個個位數相加",
          hint: "三個小數字連加，像 3 + 4 + 6，一個一個慢慢加起來",
          example: "3 + 4 + 6 = 13",
          generate() {
            const n = [rand(1, 9), rand(1, 9), rand(1, 9)];
            return { display: join3(n, "+"), answer: n[0] + n[1] + n[2] };
          },
        },
        9: {
          name: "神鷹",
          description: "三個十位數相加",
          hint: "三個兩位數連加，像 23 + 45 + 12，可以先加前兩個再加第三個",
          example: "23 + 45 + 12 = 80",
          generate() {
            const n = [rand(10, 99), rand(10, 99), rand(10, 99)];
            return { display: join3(n, "+"), answer: n[0] + n[1] + n[2] };
          },
        },
        10: {
          name: "火箭",
          description: "三個百位數相加",
          hint: "三個三位數連加，像 123 + 456 + 234，挑戰你的耐力！",
          example: "123 + 456 + 234 = 813",
          generate() {
            const n = [rand(100, 999), rand(100, 999), rand(100, 999)];
            return { display: join3(n, "+"), answer: n[0] + n[1] + n[2] };
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
          hint: "像 7 − 3、9 − 5 這種，10 以內的數字互減",
          example: "7 − 3 = 4",
          generate() {
            const a = rand(2, 10);
            const b = rand(1, a - 1);
            return { a, b, answer: a - b };
          },
        },
        2: {
          name: "小鹿",
          description: "20 以內減法，不借位",
          hint: "像 18 − 6、15 − 3 這種，個位數夠減，不需要借位",
          example: "18 − 6 = 12",
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
          hint: "像 15 − 8、13 − 7 這種，個位不夠減要跟十位借 1 變成 10",
          example: "15 − 8 = 7",
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
          hint: "像 73 − 28、95 − 47 這種，兩個兩位數互減，可能需要借位",
          example: "73 − 28 = 45",
          generate() {
            const a = rand(20, 99);
            const b = rand(10, a - 1);
            return { a, b, answer: a - b };
          },
        },
        5: {
          name: "獨角獸",
          description: "三位數減三位數",
          hint: "兩個三位數互減，像 856 − 342，一位一位往下減",
          example: "856 − 342 = 514",
          generate() {
            const a = rand(300, 999);
            const b = rand(100, a - 1);
            return { a, b, answer: a - b };
          },
        },
        6: {
          name: "大象王",
          description: "一千多減三位數",
          hint: "被減數是 1000 多，減掉一個三位數，需要跨千借位，像 1234 − 567",
          example: "1234 − 567 = 667",
          generate() {
            const a = rand(1000, 1999);
            const b = rand(100, 999);
            return { a, b, answer: a - b };
          },
        },
        7: {
          name: "暴龍",
          description: "兩千以上減去大數",
          hint: "被減數超過 2000，減掉一個一千多的數，像 2456 − 1378",
          example: "2456 − 1378 = 1078",
          generate() {
            const a = rand(2000, 3999);
            const b = rand(1000, a - 1000);
            return { a, b, answer: a - b };
          },
        },
        8: {
          name: "巨鯨",
          description: "三個個位數連減",
          hint: "從一個數連續減兩次，像 9 − 3 − 2，先減第一個再減第二個",
          example: "9 − 3 − 2 = 4",
          generate() {
            const b = rand(1, 4);
            const c = rand(1, 9 - b);
            const a = rand(b + c, 9);
            return { display: join3([a, b, c], "−"), answer: a - b - c };
          },
        },
        9: {
          name: "神鷹",
          description: "三個十位數連減",
          hint: "兩位數連續減兩次，像 85 − 23 − 14，結果不會是負數",
          example: "85 − 23 − 14 = 48",
          generate() {
            const b = rand(10, 40);
            const c = rand(10, 40);
            const a = rand(b + c, 99);
            return { display: join3([a, b, c], "−"), answer: a - b - c };
          },
        },
        10: {
          name: "火箭",
          description: "三個百位數連減",
          hint: "三位數連續減兩次，像 856 − 234 − 145，挑戰耐力！",
          example: "856 − 234 − 145 = 477",
          generate() {
            const b = rand(100, 400);
            const c = rand(100, 400);
            const a = rand(b + c, 999);
            return { display: join3([a, b, c], "−"), answer: a - b - c };
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
          hint: "只會出現 ×2、×5、×10，像 2×3、5×6、10×4 這種最簡單的乘法",
          example: "5 × 6 = 30",
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
          hint: "1×1 到 9×9 的九九乘法，像 7×8、4×6 這種",
          example: "7 × 8 = 56",
          generate() {
            const a = rand(1, 9);
            const b = rand(1, 9);
            return { a, b, answer: a * b };
          },
        },
        3: {
          name: "小獅子",
          description: "兩位數 × 一位數",
          hint: "像 12×4、35×3 這種，可以拆成十位和個位分開乘再加起來",
          example: "12 × 4 = 48",
          generate() {
            const a = rand(11, 99);
            const b = rand(2, 9);
            return { a, b, answer: a * b };
          },
        },
        4: {
          name: "小龍",
          description: "三位數 × 一位數",
          hint: "像 123×4、256×3 這種，三位數乘一個個位數",
          example: "123 × 4 = 492",
          generate() {
            const a = rand(100, 999);
            const b = rand(2, 9);
            return { a, b, answer: a * b };
          },
        },
        5: {
          name: "獨角獸",
          description: "兩位數 × 兩位數",
          hint: "像 23×45、34×12 這種，兩個兩位數相乘，是進階挑戰",
          example: "23 × 12 = 276",
          generate() {
            const a = rand(11, 99);
            const b = rand(11, 99);
            return { a, b, answer: a * b };
          },
        },
        6: {
          name: "大象王",
          description: "三個個位數相乘",
          hint: "三個小數字連乘，像 2 × 3 × 4，先乘前兩個再乘第三個",
          example: "2 × 3 × 4 = 24",
          generate() {
            const n = [rand(2, 9), rand(2, 9), rand(2, 9)];
            return { display: join3(n, "×"), answer: n[0] * n[1] * n[2] };
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
          hint: "像 12÷3、20÷5 這種，答案都是整數，不會有餘數",
          example: "12 ÷ 3 = 4",
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
          hint: "像 56÷7、72÷8 這種，其實就是九九乘法反過來問",
          example: "56 ÷ 7 = 8",
          generate() {
            const b = rand(2, 9);
            const answer = rand(2, 9);
            const a = b * answer;
            return { a, b, answer };
          },
        },
        3: {
          name: "小獅子",
          description: "三位數 ÷ 一位數（整除）",
          hint: "像 256÷4、378÷6 這種，三位數除以一個個位數，剛好除得盡",
          example: "256 ÷ 4 = 64",
          generate() {
            let b, answer, a;
            do {
              b = rand(2, 9);
              answer = rand(12, Math.floor(999 / b));
              a = b * answer;
            } while (a < 100);
            return { a, b, answer };
          },
        },
        4: {
          name: "小龍",
          description: "除以兩位數（整除）",
          hint: "像 144÷12、252÷21 這種，除數是兩位數，剛好除得盡",
          example: "144 ÷ 12 = 12",
          generate() {
            const b = rand(11, 25);
            const answer = rand(3, 20);
            const a = b * answer;
            return { a, b, answer };
          },
        },
        5: {
          name: "獨角獸",
          description: "三個數連除（整除）",
          hint: "連續除兩次，像 48 ÷ 2 ÷ 4，先算前面再除第三個，每一步都除得盡",
          example: "48 ÷ 2 ÷ 4 = 6",
          generate() {
            const answer = rand(2, 9);
            const b = rand(2, 9);
            const c = rand(2, 9);
            const a = answer * b * c;
            return { display: join3([a, b, c], "÷"), answer };
          },
        },
      },
    },
  };

  // --- 公開 API ---

  // 記住最近 3 題（用題目字串判重），避免重複
  let recentQuestions = [];

  /**
   * 產生一道題目
   * @param {string} operation - 運算類型 (addition|subtraction|multiplication|division)
   * @param {number} level - 難度等級
   * @returns {{ answer: number, display: string, operation: string, level: number }}
   */
  function generate(operation, level) {
    const op = OPERATIONS[operation];
    if (!op) throw new Error(`Unknown operation: ${operation}`);

    const lvl = op.levels[level];
    if (!lvl) throw new Error(`Unknown level ${level} for ${operation}`);

    let q, display, attempts = 0;
    do {
      q = lvl.generate();
      display = q.display || `${q.a} ${op.symbol} ${q.b}`;
      attempts++;
    } while (attempts < 25 && recentQuestions.includes(display));

    recentQuestions.push(display);
    if (recentQuestions.length > 3) recentQuestions.shift();

    return {
      a: q.a, b: q.b, answer: q.answer,
      symbol: op.symbol, display, operation, level,
    };
  }

  /**
   * 取得所有運算與難度的 metadata
   */
  function getOperations() {
    const result = {};
    for (const [key, op] of Object.entries(OPERATIONS)) {
      result[key] = { symbol: op.symbol, levels: {} };
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
