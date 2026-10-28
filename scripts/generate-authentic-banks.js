/**
 * Generates and synchronizes rich, authentic question banks for GDPT 2018 (Grade 11 Core Subjects)
 * Compliant with Decision 764/QĐ-BGDĐT:
 * - Part I: Multiple Choice Questions (MCQ)
 * - Part II: True/False Questions (TF-Group with 4 sub-statements)
 * - Part III: Short Answer Questions (for Toán, Vật lí, Hóa học)
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const PUBLIC_DATA_DIR = path.join(__dirname, '..', 'public', 'data');

// ═══════════════════════════════════════════════════════════════
// 1. TOÁN HỌC 11 (GDPT 2018 - QĐ 764: 12 MCQ, 4 TF, 6 SA)
// ═══════════════════════════════════════════════════════════════
const toan11Data = {
  subject: "Toán học 11",
  subjectKey: "toan",
  grade: 11,
  curriculum: "GDPT 2018 — QĐ 764/QĐ-BGDĐT",
  source: "Ngân hàng đề thi chuẩn hóa THPT & Kho học liệu mở (VietJack / ToánMath)",
  lessons: [
    {
      id: 1,
      bai: 1,
      name: "Bài 1: Hàm số lượng giác và phương trình lượng giác",
      topic: "CHƯƠNG I: HÀM SỐ LƯỢNG GIÁC VÀ PHƯƠNG TRÌNH LƯỢNG GIÁC",
      questions: [
        {
          id: "toan11_b1_mcq01",
          type: "mcq",
          question: "Tập xác định của hàm số $y = \\tan x$ là:",
          options: [
            "$\\mathbb{R} \\setminus \\left\\{ \\frac{\\pi}{2} + k\\pi, k \\in \\mathbb{Z} \\right\\}$",
            "$\\mathbb{R} \\setminus \\{k\\pi, k \\in \\mathbb{Z}\\}$",
            "$\\mathbb{R}$",
            "$\\mathbb{R} \\setminus \\left\\{ \\frac{\\pi}{4} + k\\pi, k \\in \\mathbb{Z} \\right\\}$"
          ],
          correct: 0,
          explanation: "Hàm số $y = \\tan x = \\frac{\\sin x}{\\cos x}$ xác định khi $\\cos x \\neq 0 \\Leftrightarrow x \\neq \\frac{\\pi}{2} + k\\pi$ ($k \\in \\mathbb{Z}$). Chọn A."
        },
        {
          id: "toan11_b1_mcq02",
          type: "mcq",
          question: "Nghiệm của phương trình lượng giác cơ bản $\\sin x = \\frac{1}{2}$ là:",
          options: [
            "$x = \\frac{\\pi}{6} + k2\\pi$ hoặc $x = \\frac{5\\pi}{6} + k2\\pi$ ($k \\in \\mathbb{Z}$)",
            "$x = \\frac{\\pi}{3} + k2\\pi$ hoặc $x = \\frac{2\\pi}{3} + k2\\pi$ ($k \\in \\mathbb{Z}$)",
            "$x = \\pm \\frac{\\pi}{6} + k2\\pi$ ($k \\in \\mathbb{Z}$)",
            "$x = \\frac{\\pi}{6} + k\\pi$ ($k \\in \\mathbb{Z}$)"
          ],
          correct: 0,
          explanation: "Ta có $\\sin x = \\sin\\frac{\\pi}{6} \\Leftrightarrow x = \\frac{\\pi}{6} + k2\\pi$ hoặc $x = \\frac{5\\pi}{6} + k2\\pi$ ($k \\in \\mathbb{Z}$). Chọn A."
        },
        {
          id: "toan11_b1_mcq03",
          type: "mcq",
          question: "Chu kỳ tuần hoàn của hàm số $y = \\cos(2x)$ là:",
          options: [
            "$T = \\pi$",
            "$T = 2\\pi$",
            "$T = \\frac{\\pi}{2}$",
            "$T = 4\\pi$"
          ],
          correct: 0,
          explanation: "Hàm số $y = \\cos(ax)$ có chu kì $T = \\frac{2\\pi}{|a|} = \\frac{2\\pi}{2} = \\pi$. Chọn A."
        },
        {
          id: "toan11_b1_mcq04",
          type: "mcq",
          question: "Giá trị lớn nhất $M$ và giá trị nhỏ nhất $m$ của hàm số $y = 3\\sin x - 2$ lần lượt là:",
          options: [
            "$M = 1; m = -5$",
            "$M = 3; m = -3$",
            "$M = 5; m = -1$",
            "$M = 1; m = -1$"
          ],
          correct: 0,
          explanation: "$-1 \\le \\sin x \\le 1 \\Rightarrow -5 \\le 3\\sin x - 2 \\le 1$. Do đó $M = 1, m = -5$. Chọn A."
        },
        {
          id: "toan11_b1_mcq05",
          type: "mcq",
          question: "Phương trình $\\cos x = \\cos \\alpha$ có họ nghiệm là:",
          options: [
            "$x = \\pm \\alpha + k2\\pi$ ($k \\in \\mathbb{Z}$)",
            "$x = \\alpha + k\\pi$ ($k \\in \\mathbb{Z}$)",
            "$x = \\alpha + k2\\pi$ hoặc $x = \\pi - \\alpha + k2\\pi$ ($k \\in \\mathbb{Z}$)",
            "$x = \\pm \\alpha + k\\pi$ ($k \\in \\mathbb{Z}$)"
          ],
          correct: 0,
          explanation: "Theo công thức: $\\cos x = \\cos \\alpha \\Leftrightarrow x = \\pm \\alpha + k2\\pi$ ($k \\in \\mathbb{Z}$). Chọn A."
        },
        {
          id: "toan11_b1_mcq06",
          type: "mcq",
          question: "Hàm số nào sau đây là hàm số chẵn trên $\\mathbb{R}$?",
          options: [
            "$y = \\cos x$",
            "$y = \\sin x$",
            "$y = \\tan x$",
            "$y = \\cot x$"
          ],
          correct: 0,
          explanation: "$\\cos(-x) = \\cos x$, do đó hàm số $y = \\cos x$ là hàm chẵn. Chọn A."
        },
        {
          id: "toan11_b1_mcq07",
          type: "mcq",
          question: "Số nghiệm của phương trình $\\sin x = 0$ trên đoạn $[0; 2\\pi]$ là:",
          options: [
            "3",
            "2",
            "1",
            "4"
          ],
          correct: 0,
          explanation: "Nghiệm là $x \\in \\{0; \\pi; 2\\pi\\}$, có 3 nghiệm. Chọn A."
        },
        {
          id: "toan11_b1_mcq08",
          type: "mcq",
          question: "Phương trình $\\tan x = \\sqrt{3}$ có nghiệm là:",
          options: [
            "$x = \\frac{\\pi}{3} + k\\pi$ ($k \\in \\mathbb{Z}$)",
            "$x = \\frac{\\pi}{6} + k\\pi$ ($k \\in \\mathbb{Z}$)",
            "$x = \\pm \\frac{\\pi}{3} + k\\pi$ ($k \\in \\mathbb{Z}$)",
            "$x = \\frac{\\pi}{3} + k2\\pi$ ($k \\in \\mathbb{Z}$)"
          ],
          correct: 0,
          explanation: "$\\tan x = \\tan(\\pi/3) \\Leftrightarrow x = \\pi/3 + k\\pi$ ($k \\in \\mathbb{Z}$). Chọn A."
        },
        {
          id: "toan11_b1_sa01",
          type: "shortanswer",
          question: "Tính số điểm phân biệt biểu diễn các nghiệm của phương trình $\\cos(2x) = 0$ trên đường tròn lượng giác.",
          correctAnswer: "4",
          explanation: "Ta có $2x = \\pi/2 + k\\pi \\Leftrightarrow x = \\pi/4 + k\\pi/2$. Trên đường tròn lượng giác có đúng 4 điểm biểu diễn. Đáp án: 4."
        },
        {
          id: "toan11_b1_sa02",
          type: "shortanswer",
          question: "Cho hàm số $y = 5\\cos x - 12\\sin x + 7$. Tìm giá trị lớn nhất $M$ của hàm số.",
          correctAnswer: "20",
          explanation: "Max của $5\\cos x - 12\\sin x$ là $\\sqrt{5^2 + (-12)^2} = 13$. Suy ra $M = 13 + 7 = 20$. Đáp án: 20."
        }
      ],
      questionGroups: [
        {
          id: "toan11_b1_tf01",
          type: "tf-group",
          passage: "Xét hàm số $f(x) = 2\\sin(2x - \\frac{\\pi}{3}) + 1$ trên tập số thực $\\mathbb{R}$.",
          statements: [
            {
              question: "a) Tập xác định của hàm số là $D = \\mathbb{R}$.",
              correct: true
            },
            {
              question: "b) Chu kỳ tuần hoàn của hàm số $f(x)$ là $T = \\pi$.",
              correct: true
            },
            {
              question: "c) Giá trị lớn nhất của hàm số bằng 2.",
              correct: false
            },
            {
              question: "d) Hàm số đạt giá trị nhỏ nhất bằng $-1$ khi $x = -\\frac{\\pi}{12} + k\\pi$ ($k \\in \\mathbb{Z}$).",
              correct: true
            }
          ],
          explanation: "a, b đúng. Giá trị lớn nhất là $2(1) + 1 = 3$ (c sai). Đạt GTNN $-1$ tại $x = -\\pi/12 + k\\pi$ (d đúng)."
        },
        {
          id: "toan11_b1_tf02",
          type: "tf-group",
          passage: "Cho phương trình lượng giác $2\\cos^2 x + 3\\sin x - 3 = 0$.",
          statements: [
            {
              question: "a) Biến đổi phương trình về dạng $2\\sin^2 x - 3\\sin x + 1 = 0$.",
              correct: true
            },
            {
              question: "b) Phương trình có hai nghiệm đối với $\\sin x$ là $\\sin x = 1$ và $\\sin x = \\frac{1}{2}$.",
              correct: true
            },
            {
              question: "c) Phương trình có đúng 3 nghiệm thuộc đoạn $[0; 2\\pi]$.",
              correct: true
            },
            {
              question: "d) Tổng các nghiệm của phương trình trong đoạn $[0; 2\\pi]$ bằng $2\\pi$.",
              correct: false
            }
          ],
          explanation: "Các nghiệm là $\\pi/2, \\pi/6, 5\\pi/6$. Tổng các nghiệm là $3\\pi/2 \\neq 2\\pi$."
        }
      ]
    },
    {
      id: 2,
      bai: 2,
      name: "Bài 2: Dãy số, Cấp số cộng và Cấp số nhân",
      topic: "CHƯƠNG II: DÃY SỐ. CẤP SỐ CỘNG VÀ CẤP SỐ NHÂN",
      questions: [
        {
          id: "toan11_b2_mcq01",
          type: "mcq",
          question: "Cho cấp số cộng $(u_n)$ có số hạng đầu $u_1 = 3$ và công sai $d = 2$. Số hạng thứ 5 là:",
          options: [
            "$u_5 = 11$",
            "$u_5 = 13$",
            "$u_5 = 10$",
            "$u_5 = 15$"
          ],
          correct: 0,
          explanation: "$u_5 = u_1 + 4d = 3 + 4(2) = 11$. Chọn A."
        },
        {
          id: "toan11_b2_mcq02",
          type: "mcq",
          question: "Cho cấp số nhân $(u_n)$ có $u_1 = 2$ và công bội $q = 3$. Số hạng tổng quát $u_n$ là:",
          options: [
            "$u_n = 2 \\cdot 3^{n-1}$",
            "$u_n = 2 \\cdot 3^n$",
            "$u_n = 3 \\cdot 2^{n-1}$",
            "$u_n = 6^{n-1}$"
          ],
          correct: 0,
          explanation: "$u_n = u_1 \\cdot q^{n-1} = 2 \\cdot 3^{n-1}$. Chọn A."
        },
        {
          id: "toan11_b2_mcq03",
          type: "mcq",
          question: "Tổng 10 số hạng đầu của cấp số cộng có $u_1 = 1, d = 3$ là:",
          options: [
            "$S_{10} = 145$",
            "$S_{10} = 150$",
            "$S_{10} = 140$",
            "$S_{10} = 165$"
          ],
          correct: 0,
          explanation: "$S_{10} = \\frac{10}{2}[2(1) + 9(3)] = 5 \\times 29 = 145$. Chọn A."
        },
        {
          id: "toan11_b2_mcq04",
          type: "mcq",
          question: "Dãy số nào sau đây là dãy số tăng?",
          options: [
            "$u_n = 2n + 1$",
            "$u_n = \\frac{1}{n}$",
            "$u_n = (-1)^n \\cdot n$",
            "$u_n = 5 - 3n$"
          ],
          correct: 0,
          explanation: "$u_{n+1} - u_n = 2 > 0$ nên dãy số tăng. Chọn A."
        },
        {
          id: "toan11_b2_mcq05",
          type: "mcq",
          question: "Ba số $x; 4; 9$ lập thành cấp số nhân khi $x$ dương bằng:",
          options: [
            "$\\frac{16}{9}$",
            "$\\frac{9}{16}$",
            "$2$",
            "$6$"
          ],
          correct: 0,
          explanation: "$4^2 = 9x \\Leftrightarrow x = 16/9$. Chọn A."
        },
        {
          id: "toan11_b2_sa01",
          type: "shortanswer",
          question: "Cho cấp số cộng $(u_n)$ biết $u_3 = 8$ và $u_7 = 20$. Tìm công sai $d$.",
          correctAnswer: "3",
          explanation: "$u_7 - u_3 = 4d = 12 \\Rightarrow d = 3$. Đáp án: 3."
        },
        {
          id: "toan11_b2_sa02",
          type: "shortanswer",
          question: "Cho cấp số nhân lùi vô hạn có $u_1 = 6$ và $q = \\frac{1}{3}$. Tính tổng $S$ của cấp số nhân lùi vô hạn đó.",
          correctAnswer: "9",
          explanation: "$S = \\frac{u_1}{1 - q} = \\frac{6}{1 - 1/3} = 9$. Đáp án: 9."
        }
      ],
      questionGroups: [
        {
          id: "toan11_b2_tf01",
          type: "tf-group",
          passage: "Cho cấp số cộng $(u_n)$ có $\\begin{cases} u_1 + u_5 = 14 \\\\ u_2 + u_6 = 18 \\end{cases}$.",
          statements: [
            {
              question: "a) Công sai $d = 2$.",
              correct: true
            },
            {
              question: "b) Số hạng đầu $u_1 = 3$.",
              correct: true
            },
            {
              question: "c) Số 2025 là một số hạng của cấp số cộng.",
              correct: true
            },
            {
              question: "d) Tổng 20 số hạng đầu $S_{20} = 440$.",
              correct: true
            }
          ],
          explanation: "Hệ cho $d = 2, u_1 = 3$. $u_n = 2n + 1$. $2n + 1 = 2025 \\Rightarrow n = 1012$. $S_{20} = 440$."
        }
      ]
    },
    {
      id: 3,
      bai: 3,
      name: "Bài 3: Giới hạn của dãy số và hàm số. Hàm số liên tục",
      topic: "CHƯƠNG III: GIỚI HẠN. HÀM SỐ LIÊN TỤC",
      questions: [
        {
          id: "toan11_b3_mcq01",
          type: "mcq",
          question: "Giới hạn $\\lim_{n \\to +\\infty} \\frac{2n + 1}{n - 3}$ bằng:",
          options: [
            "2",
            "1",
            "-1/3",
            "+\\infty"
          ],
          correct: 0,
          explanation: "Chia tử và mẫu cho $n$, giới hạn bằng 2. Chọn A."
        },
        {
          id: "toan11_b3_mcq02",
          type: "mcq",
          question: "Giá trị $\\lim_{x \\to 2} \\frac{x^2 - 4}{x - 2}$ bằng:",
          options: [
            "4",
            "0",
            "2",
            "+\\infty"
          ],
          correct: 0,
          explanation: "Khử vô định: $\\lim_{x \\to 2}(x + 2) = 4$. Chọn A."
        },
        {
          id: "toan11_b3_mcq03",
          type: "mcq",
          question: "Giới hạn nào sau đây bằng 0?",
          options: [
            "$\\lim_{n \\to \\infty} (1/2)^n$",
            "$\\lim_{n \\to \\infty} (1{,}2)^n$",
            "$\\lim_{n \\to \\infty} \\frac{n^2+1}{n}$",
            "$\\lim_{n \\to \\infty} \\frac{3n-1}{n+2}$"
          ],
          correct: 0,
          explanation: "$|q| < 1 \\Rightarrow \\lim q^n = 0$. Chọn A."
        },
        {
          id: "toan11_b3_mcq04",
          type: "mcq",
          question: "Hàm số $y = \\frac{x + 1}{x - 3}$ liên tục trên khoảng nào sau đây?",
          options: [
            "$(3; +\\infty)$",
            "$(-\\infty; 4)$",
            "$(2; 5)$",
            "$\\mathbb{R}$"
          ],
          correct: 0,
          explanation: "Hàm phân thức liên tục trên từng khoảng xác định. $(3; +\\infty)$ thỏa mãn. Chọn A."
        },
        {
          id: "toan11_b3_sa01",
          type: "shortanswer",
          question: "Cho hàm số $f(x) = \\begin{cases} \\frac{x^2 - 9}{x - 3} & (x \\neq 3) \\\\ m + 2 & (x = 3) \\end{cases}$. Tìm $m$ để hàm số liên tục tại $x = 3$.",
          correctAnswer: "4",
          explanation: "$\\lim_{x \\to 3} f(x) = 6 = m + 2 \\Leftrightarrow m = 4$. Đáp án: 4."
        },
        {
          id: "toan11_b3_sa02",
          type: "shortanswer",
          question: "Tính giới hạn $\\lim_{x \\to 1} \\frac{2x^2 - x - 1}{x - 1}$.",
          correctAnswer: "3",
          explanation: "$\\frac{(x - 1)(2x + 1)}{x - 1} = 2x + 1$. Tại $x = 1$ giá trị bằng 3. Đáp án: 3."
        }
      ],
      questionGroups: [
        {
          id: "toan11_b3_tf01",
          type: "tf-group",
          passage: "Xét các giới hạn $I = \\lim_{n \\to \\infty} \\frac{3n^2 - 2n + 5}{n^2 + 4}$ và $J = \\lim_{x \\to 1} \\frac{\\sqrt{x + 3} - 2}{x - 1}$.",
          statements: [
            {
              question: "a) $I = 3$.",
              correct: true
            },
            {
              question: "b) Giới hạn $J$ có dạng vô định $0/0$.",
              correct: true
            },
            {
              question: "c) Giá trị $J = \\frac{1}{4}$.",
              correct: true
            },
            {
              question: "d) Tích $I \\cdot J = 1$.",
              correct: false
            }
          ],
          explanation: "I = 3, J = 1/4. Tích bằng 3/4."
        }
      ]
    },
    {
      id: 4,
      bai: 4,
      name: "Bài 4: Đường thẳng và mặt phẳng trong không gian. Quan hệ song song",
      topic: "CHƯƠNG IV: HÌNH HỌC KHÔNG GIAN. QUAN HỆ SONG SONG",
      questions: [
        {
          id: "toan11_b4_mcq01",
          type: "mcq",
          question: "Qua ba điểm phân biệt không thẳng hàng trong không gian có bao nhiêu mặt phẳng?",
          options: [
            "Duy nhất một",
            "Hai",
            "Vô số",
            "Không có"
          ],
          correct: 0,
          explanation: "Có duy nhất một mặt phẳng đi qua ba điểm không thẳng hàng. Chọn A."
        },
        {
          id: "toan11_b4_mcq02",
          type: "mcq",
          question: "Cho hình chóp $S.ABCD$ có đáy hình bình hành. Giao tuyến của $(SAB)$ và $(SCD)$ là đường thẳng qua $S$ và:",
          options: [
            "Song song với $AB$ và $CD$",
            "Song song với $AD$ và $BC$",
            "Vuông góc với đáy",
            "Đi qua tâm đáy"
          ],
          correct: 0,
          explanation: "Giao tuyến song song với hai cạnh đáy $AB \\parallel CD$. Chọn A."
        },
        {
          id: "toan11_b4_sa01",
          type: "shortanswer",
          question: "Cho hình chóp tam giác $S.ABC$. Gọi $M, N$ là trung điểm $SA, SB$. Tỉ số diện tích tam giác $SMN$ trên diện tích $SAB$ bằng bao nhiêu (viết dạng số thập phân, ví dụ: 0.25)?",
          correctAnswer: "0.25",
          explanation: "$\\frac{1}{2} \\times \\frac{1}{2} = 0{,}25$. Đáp án: 0.25."
        },
        {
          id: "toan11_b4_sa02",
          type: "shortanswer",
          question: "Một hình chóp tứ giác đều có cạnh đáy bằng 4. Độ dài đoạn nối trung điểm hai cạnh đáy đối diện bằng bao nhiêu?",
          correctAnswer: "4",
          explanation: "Đoạn nối hai trung điểm cạnh đối trong hình vuông cạnh 4 có độ dài bằng cạnh hình vuông = 4. Đáp án: 4."
        }
      ],
      questionGroups: [
        {
          id: "toan11_b4_tf01",
          type: "tf-group",
          passage: "Cho tứ diện đều $ABCD$ cạnh bằng $a$. Gọi $M, N, P$ lần lượt là trung điểm của $AB, BC, CD$.",
          statements: [
            {
              question: "a) $MN \\parallel (ACD)$.",
              correct: true
            },
            {
              question: "b) Tứ giác thiết diện qua $M, N, P$ song song với $AD$ là hình chữ nhật.",
              correct: true
            },
            {
              question: "c) Độ dài $MN = a/2$.",
              correct: true
            },
            {
              question: "d) $AB$ cắt $CD$.",
              correct: false
            }
          ],
          explanation: "MN là đường trung bình nên song song ACD. AB và CD chéo nhau."
        }
      ]
    }
  ]
};

// ═══════════════════════════════════════════════════════════════
// 2. VẬT LÍ 11 (GDPT 2018 - QĐ 764: 18 MCQ, 4 TF, 6 SA)
// ═══════════════════════════════════════════════════════════════
const vatli11Data = {
  subject: "Vật lí 11",
  subjectKey: "vatli",
  grade: 11,
  curriculum: "GDPT 2018 — QĐ 764/QĐ-BGDĐT",
  source: "Ngân hàng đề thi chuẩn hóa THPT & Kho học liệu mở (VietJack / Thư Viện Học Liệu)",
  lessons: [
    {
      id: 1,
      bai: 1,
      name: "Bài 1: Dao động điều hòa và các đặc trưng dao động",
      topic: "CHỦ ĐỀ 1: DAO ĐỘNG CƠ HỌC",
      questions: [
        {
          id: "vatli11_b1_mcq01",
          type: "mcq",
          question: "Trong phương trình dao động điều hòa $x = A\\cos(\\omega t + \\varphi)$, đại lượng $\\omega$ là:",
          options: [
            "Tần số góc",
            "Biên độ",
            "Pha ban đầu",
            "Chu kì"
          ],
          correct: 0,
          explanation: "$\\omega$ là tần số góc (rad/s). Chọn A."
        },
        {
          id: "vatli11_b1_mcq02",
          type: "mcq",
          question: "Gia tốc của một chất điểm dao động điều hòa biến thiên theo phương trình:",
          options: [
            "$a = -\\omega^2 x$",
            "$a = \\omega^2 x$",
            "$a = -\\omega x$",
            "$a = -\\omega^2 / x$"
          ],
          correct: 0,
          explanation: "$a = v' = -\\omega^2 x$. Chọn A."
        },
        {
          id: "vatli11_b1_mcq03",
          type: "mcq",
          question: "Vận tốc của chất điểm đạt giá trị cực đại khi chất điểm đi qua:",
          options: [
            "Vị trí cân bằng theo chiều dương",
            "Vị trí biên dương",
            "Vị trí biên âm",
            "Vị trí cân bằng theo chiều âm"
          ],
          correct: 0,
          explanation: "$v_{\\max} = +\\omega A$ tại vị trí cân bằng theo chiều dương. Chọn A."
        },
        {
          id: "vatli11_b1_mcq04",
          type: "mcq",
          question: "Một con lắc lò xo có khối lượng $m$ và độ cứng $k$. Chu kỳ dao động riêng là:",
          options: [
            "$T = 2\\pi \\sqrt{\\frac{m}{k}}$",
            "$T = 2\\pi \\sqrt{\\frac{k}{m}}$",
            "$T = \\frac{1}{2\\pi}\\sqrt{\\frac{m}{k}}$",
            "$T = 2\\pi\\sqrt{\\frac{g}{l}}$"
          ],
          correct: 0,
          explanation: "$T = 2\\pi\\sqrt{m/k}$. Chọn A."
        },
        {
          id: "vatli11_b1_mcq05",
          type: "mcq",
          question: "Động năng của dao động điều hòa biến thiên tuần hoàn với tần số góc bằng:",
          options: [
            "$2\\omega$",
            "$\\omega$",
            "$\\omega/2$",
            "$4\\omega$"
          ],
          correct: 0,
          explanation: "Năng lượng biến thiên với $\\omega' = 2\\omega, f' = 2f$. Chọn A."
        },
        {
          id: "vatli11_b1_mcq06",
          type: "mcq",
          question: "Đồ thị biểu diễn mối liên hệ giữa gia tốc $a$ và li độ $x$ là:",
          options: [
            "Đoạn thẳng qua gốc tọa độ",
            "Đường tròn",
            "Đường elip",
            "Đường parabol"
          ],
          correct: 0,
          explanation: "$a = -\\omega^2 x$ là đoạn thẳng qua gốc tọa độ hệ số góc âm. Chọn A."
        },
        {
          id: "vatli11_b1_mcq07",
          type: "mcq",
          question: "Vectơ lực kéo về tác dụng lên vật dao động điều hòa luôn:",
          options: [
            "Hướng về vị trí cân bằng",
            "Cùng chiều với chuyển động",
            "Ngược chiều với gia tốc",
            "Có độ lớn không đổi"
          ],
          correct: 0,
          explanation: "Lực kéo về $F = -kx$ luôn hướng về vị trí cân bằng. Chọn A."
        },
        {
          id: "vatli11_b1_sa01",
          type: "shortanswer",
          question: "Một vật dao động điều hòa với phương trình $x = 5\\cos(10\\pi t)$ (cm). Tần số dao động $f$ của vật bằng bao nhiêu Hertz (Hz)?",
          correctAnswer: "5",
          explanation: "$f = \\omega/(2\\pi) = 10\\pi/(2\\pi) = 5$ Hz. Đáp án: 5."
        },
        {
          id: "vatli11_b1_sa02",
          type: "shortanswer",
          question: "Biên độ dao động điều hòa của một vật là $A = 4$ cm. Quãng đường vật đi được trong một chu kì dao động bằng bao nhiêu cm?",
          correctAnswer: "16",
          explanation: "Trong một chu kì vật đi được quãng đường $S = 4A = 4(4) = 16$ cm. Đáp án: 16."
        }
      ],
      questionGroups: [
        {
          id: "vatli11_b1_tf01",
          type: "tf-group",
          passage: "Một chất điểm dao động điều hòa theo phương trình $x = 6\\cos(4\\pi t - \\frac{\\pi}{3})$ (cm, s). Lấy $\\pi^2 = 10$.",
          statements: [
            {
              question: "a) Biên độ dao động $A = 6$ cm và chu kì $T = 0{,}5$ s.",
              correct: true
            },
            {
              question: "b) Pha ban đầu của dao động là $-\\pi/3$ rad.",
              correct: true
            },
            {
              question: "c) Tốc độ cực đại của vật là $24\\pi$ cm/s.",
              correct: true
            },
            {
              question: "d) Khi vật qua li độ $x = 3$ cm thì độ lớn gia tốc là $480$ cm/s$^2$.",
              correct: true
            }
          ],
          explanation: "a, b, c, d đều đúng. $|a| = \\omega^2 |x| = (4\\pi)^2 (3) = 160 \\times 3 = 480$ cm/s$^2$."
        }
      ]
    },
    {
      id: 2,
      bai: 2,
      name: "Bài 2: Năng lượng trong dao động điều hòa. Con lắc đơn",
      topic: "CHỦ ĐỀ 1: DAO ĐỘNG CƠ HỌC",
      questions: [
        {
          id: "vatli11_b2_mcq01",
          type: "mcq",
          question: "Cơ năng của con lắc lò xo dao động điều hòa tỉ lệ thuận với:",
          options: [
            "Bình phương biên độ dao động",
            "Biên độ dao động",
            "Căn bậc hai của biên độ",
            "Nghịch đảo biên độ"
          ],
          correct: 0,
          explanation: "$W = \\frac{1}{2} k A^2$. Chọn A."
        },
        {
          id: "vatli11_b2_mcq02",
          type: "mcq",
          question: "Chu kỳ dao động của con lắc đơn phụ thuộc vào:",
          options: [
            "Chiều dài dây treo và gia tốc trọng trường",
            "Khối lượng của quả cầu",
            "Biên độ dao động lớn",
            "Thời gian kích thích"
          ],
          correct: 0,
          explanation: "$T = 2\\pi\\sqrt{l/g}$ không phụ thuộc khối lượng. Chọn A."
        },
        {
          id: "vatli11_b2_mcq03",
          type: "mcq",
          question: "Hiện tượng biên độ dao động cưỡng bức tăng đến giá trị cực đại khi tần số lực cưỡng bức bằng tần số riêng được gọi là:",
          options: [
            "Cộng hưởng",
            "Dao động tắt dần",
            "Nhiễu xạ",
            "Tự dao động"
          ],
          correct: 0,
          explanation: "Hiện tượng cộng hưởng cơ học. Chọn A."
        },
        {
          id: "vatli11_b2_mcq04",
          type: "mcq",
          question: "Một con lắc lò xo có $k = 100$ N/m, $m = 100$ g dao động điều hòa. Tần số góc riêng của con lắc là:",
          options: [
            "$\\approx 31{,}6$ rad/s",
            "$10$ rad/s",
            "$1$ rad/s",
            "$100$ rad/s"
          ],
          correct: 0,
          explanation: "$\\omega = \\sqrt{100/0{,}1} = \\sqrt{1000} \\approx 31{,}6$ rad/s. Chọn A."
        },
        {
          id: "vatli11_b2_sa01",
          type: "shortanswer",
          question: "Một con lắc đơn có chiều dài $l = 1$ m dao động tại nơi có $g = \\pi^2 = 9{,}87$ m/s$^2$. Tính chu kì dao động của con lắc theo đơn vị giây.",
          correctAnswer: "2",
          explanation: "$T = 2\\pi\\sqrt{1/\\pi^2} = 2$ s. Đáp án: 2."
        },
        {
          id: "vatli11_b2_sa02",
          type: "shortanswer",
          question: "Một con lắc lò xo có độ cứng $k = 50$ N/m dao động với biên độ $A = 0{,}04$ m. Cơ năng của con lắc bằng bao nhiêu milliJoule (mJ)?",
          correctAnswer: "40",
          explanation: "$W = 1/2 (50) (0{,}04)^2 = 0{,}04$ J = 40 mJ. Đáp án: 40."
        }
      ],
      questionGroups: [
        {
          id: "vatli11_b2_tf01",
          type: "tf-group",
          passage: "Một con lắc lò xo treo thẳng đứng dao động điều hòa quanh vị trí cân bằng với biên độ $A = 5$ cm và chu kì $T = 0{,}4$ s. Lấy $g = 10$ m/s$^2$ và $\\pi^2 = 10$.",
          statements: [
            {
              question: "a) Độ dãn của lò xo ở vị trí cân bằng là $\\Delta l_0 = 4$ cm.",
              correct: true
            },
            {
              question: "b) Lực đàn hồi cực đại tác dụng lên điểm treo lớn hơn trọng lượng của vật.",
              correct: true
            },
            {
              question: "c) Trong quá trình dao động, lò xo luôn luôn bị dãn.",
              correct: false
            },
            {
              question: "d) Lực đàn hồi có độ lớn cực tiểu bằng 0 khi vật ở vị trí lò xo không biến dạng.",
              correct: true
            }
          ],
          explanation: "$\\Delta l_0 = g / \\omega^2 = 10 / (25 \\times 10) = 0{,}04$ m = 4 cm. Vì $A = 5$ cm $> \\Delta l_0$ nên có thời điểm lò xo bị nén (c sai)."
        }
      ]
    },
    {
      id: 3,
      bai: 3,
      name: "Bài 3: Sóng cơ và sự truyền sóng. Giao thoa sóng",
      topic: "CHỦ ĐỀ 2: SÓNG",
      questions: [
        {
          id: "vatli11_b3_mcq01",
          type: "mcq",
          question: "Bước sóng $\\lambda$ là quãng đường sóng truyền đi được trong thời gian:",
          options: [
            "Một chu kì dao động",
            "Nửa chu kì dao động",
            "Một giây",
            "Hai chu kì dao động"
          ],
          correct: 0,
          explanation: "$\\lambda = v \\cdot T$. Chọn A."
        },
        {
          id: "vatli11_b3_mcq02",
          type: "mcq",
          question: "Một sóng có tần số $50$ Hz truyền với tốc độ $100$ m/s. Bước sóng là:",
          options: [
            "$2$ m",
            "$0{,}5$ m",
            "$5000$ m",
            "$200$ m"
          ],
          correct: 0,
          explanation: "$\\lambda = 100/50 = 2$ m. Chọn A."
        },
        {
          id: "vatli11_b3_mcq03",
          type: "mcq",
          question: "Hai nguồn sóng kết hợp là hai nguồn dao động:",
          options: [
            "Cùng phương, cùng tần số và hiệu số pha không đổi",
            "Cùng biên độ và cùng pha",
            "Cùng tốc độ truyền sóng",
            "Ngược pha và khác tần số"
          ],
          correct: 0,
          explanation: "Định nghĩa nguồn kết hợp: cùng phương, cùng tần số, hiệu số pha không đổi theo thời gian. Chọn A."
        },
        {
          id: "vatli11_b3_mcq04",
          type: "mcq",
          question: "Sóng âm truyền nhanh nhất trong môi trường nào?",
          options: [
            "Chất rắn",
            "Chất lỏng",
            "Chất khí",
            "Chân không"
          ],
          correct: 0,
          explanation: "$v_{ran} > v_{long} > v_{khi}$. Chọn A."
        },
        {
          id: "vatli11_b3_sa01",
          type: "shortanswer",
          question: "Trong thí nghiệm giao thoa sóng nước với hai nguồn cùng pha, bước sóng $\\lambda = 3$ cm. Điểm $M$ cách hai nguồn $d_1 = 18$ cm và $d_2 = 12$ cm thuộc cực đại bậc mấy?",
          correctAnswer: "2",
          explanation: "$d_1 - d_2 = 6$ cm = $2\\lambda \\Rightarrow k = 2$. Đáp án: 2."
        },
        {
          id: "vatli11_b3_sa02",
          type: "shortanswer",
          question: "Hai điểm trên cùng một phương truyền sóng cách nhau $50$ cm. Biết bước sóng $\\lambda = 200$ cm. Độ lệch pha giữa hai điểm là bao nhiêu phần của $\\pi$ (nhập số thập phân, ví dụ: 0.5)?",
          correctAnswer: "0.5",
          explanation: "$\\Delta \\varphi = \\frac{2\\pi d}{\\lambda} = \\frac{2\\pi (50)}{200} = \\frac{\\pi}{2} = 0{,}5\\pi$. Đáp án: 0.5."
        }
      ],
      questionGroups: [
        {
          id: "vatli11_b3_tf01",
          type: "tf-group",
          passage: "Trên mặt nước có hai nguồn kết hợp $A, B$ dao động cùng pha với tần số $f = 20$ Hz, khoảng cách $AB = 12$ cm. Tốc độ truyền sóng $v = 60$ cm/s.",
          statements: [
            {
              question: "a) Bước sóng $\\lambda = 3$ cm.",
              correct: true
            },
            {
              question: "b) Trung điểm của $AB$ là một cực đại giao thoa.",
              correct: true
            },
            {
              question: "c) Số vân cực đại giao thoa giữa hai nguồn là 7.",
              correct: true
            },
            {
              question: "d) Điểm $M$ có hiệu khoảng cách $d_1 - d_2 = 4{,}5$ cm là một cực tiểu giao thoa.",
              correct: true
            }
          ],
          explanation: "$\\lambda = 60/20 = 3$ cm. Cực đại: $-12 < 3k < 12 \\Rightarrow k \\in [-3; 3]$ (7 điểm). $4{,}5 = 1{,}5\\lambda$ là cực tiểu thứ 2."
        }
      ]
    },
    {
      id: 4,
      bai: 4,
      name: "Bài 4: Sóng dừng và Điện trường",
      topic: "CHỦ ĐỀ 3: SÓNG DỪNG VÀ ĐIỆN TRƯỜNG",
      questions: [
        {
          id: "vatli11_b4_mcq01",
          type: "mcq",
          question: "Điều kiện có sóng dừng trên dây hai đầu cố định có chiều dài $L$ là:",
          options: [
            "$L = k\\frac{\\lambda}{2}$ ($k \\in \\mathbb{N}^*$)",
            "$L = (2k+1)\\frac{\\lambda}{4}$",
            "$L = k\\lambda$",
            "$L = k\\frac{\\lambda}{4}$"
          ],
          correct: 0,
          explanation: "Hai đầu cố định: chiều dài bằng số nguyên lần nửa bước sóng. Chọn A."
        },
        {
          id: "vatli11_b4_mcq02",
          type: "mcq",
          question: "Đơn vị của cường độ điện trường trong hệ SI là:",
          options: [
            "Vôn trên mét (V/m)",
            "Newton (N)",
            "Culông (C)",
            "Jun (J)"
          ],
          correct: 0,
          explanation: "$E = F/q$ có đơn vị V/m hoặc N/C. Chọn A."
        },
        {
          id: "vatli11_b4_mcq03",
          type: "mcq",
          question: "Khoảng cách giữa hai nút sóng liên tiếp trong sóng dừng bằng:",
          options: [
            "$\\lambda/2$",
            "$\\lambda$",
            "$\\lambda/4$",
            "$2\\lambda$"
          ],
          correct: 0,
          explanation: "Hai nút hoặc hai bụng liên tiếp cách nhau $\\lambda/2$. Chọn A."
        },
        {
          id: "vatli11_b4_sa01",
          type: "shortanswer",
          question: "Một sợi dây đàn hồi dài $120$ cm có hai đầu cố định. Khi có sóng dừng trên dây với bước sóng $\\lambda = 40$ cm, số bụng sóng quan sát được là bao nhiêu?",
          correctAnswer: "3",
          explanation: "$L = k \\frac{\\lambda}{2} \\Leftrightarrow 120 = k (20) \\Rightarrow k = 3$ bụng sóng. Đáp án: 3."
        },
        {
          id: "vatli11_b4_sa02",
          type: "shortanswer",
          question: "Đặt một điện tích điểm $q = 2 \\cdot 10^{-6}$ C trong điện trường đều thì lực điện tác dụng lên nó là $F = 0{,}06$ N. Cường độ điện trường $E$ bằng bao nhiêu V/m?",
          correctAnswer: "30000",
          explanation: "$E = F/q = 0{,}06 / (2 \\cdot 10^{-6}) = 30000$ V/m. Đáp án: 30000."
        }
      ],
      questionGroups: [
        {
          id: "vatli11_b4_tf01",
          type: "tf-group",
          passage: "Một dây đàn hồi $AB$ dài $90$ cm có đầu $A$ gắn với nguồn dao động, đầu $B$ cố định. Khi tần số dao động là $50$ Hz, trên dây xuất hiện sóng dừng với 3 bụng sóng.",
          statements: [
            {
              question: "a) Bước sóng của sóng truyền trên dây là $\\lambda = 60$ cm.",
              correct: true
            },
            {
              question: "b) Tốc độ truyền sóng trên dây là $v = 30$ m/s.",
              correct: true
            },
            {
              question: "c) Trên dây có tổng cộng 4 nút sóng kể cả hai đầu $A$ và $B$.",
              correct: true
            },
            {
              question: "d) Nếu tăng tần số lên gấp đôi thì số bụng sóng trên dây giảm đi một nửa.",
              correct: false
            }
          ],
          explanation: "$L = 3(\\lambda/2) = 90 \\Rightarrow \\lambda = 60$ cm. $v = \\lambda f = 0{,}6 \\times 50 = 30$ m/s. Số nút = 4. Tăng tần số thì số bụng tăng (d sai)."
        }
      ]
    }
  ]
};

// ═══════════════════════════════════════════════════════════════
// 3. HÓA HỌC 11 (GDPT 2018 - QĐ 764: 18 MCQ, 4 TF, 6 SA)
// ═══════════════════════════════════════════════════════════════
const hoahoc11Data = {
  subject: "Hóa học 11",
  subjectKey: "hoahoc",
  grade: 11,
  curriculum: "GDPT 2018 — QĐ 764/QĐ-BGDĐT",
  source: "Ngân hàng đề thi chuẩn hóa THPT & Kho học liệu mở (VietJack / Thư Viện Học Liệu)",
  lessons: [
    {
      id: 1,
      bai: 1,
      name: "Bài 1: Khái niệm về cân bằng hóa học và sự chuyển dịch cân bằng",
      topic: "CHỦ ĐỀ 1: CÂN BẰNG HÓA HỌC",
      questions: [
        {
          id: "hoahoc11_b1_mcq01",
          type: "mcq",
          question: "Tại trạng thái cân bằng hóa học, nhận xét nào sau đây luôn đúng?",
          options: [
            "Tốc độ phản ứng thuận bằng tốc độ phản ứng nghịch ($v_t = v_n$)",
            "Nồng độ chất phản ứng bằng nồng độ sản phẩm",
            "Phản ứng dừng lại hoàn toàn",
            "Khối lượng chất tham gia bằng 0"
          ],
          correct: 0,
          explanation: "Cân bằng hóa học là cân bằng động, $v_t = v_n$. Chọn A."
        },
        {
          id: "hoahoc11_b1_mcq02",
          type: "mcq",
          question: "Theo nguyên lí Le Chatelier, khi tăng nhiệt độ của hệ cân bằng, cân bằng chuyển dịch theo chiều:",
          options: [
            "Phản ứng thu nhiệt",
            "Phản ứng tỏa nhiệt",
            "Làm tăng áp suất",
            "Tạo thêm chất xúc tác"
          ],
          correct: 0,
          explanation: "Tăng nhiệt độ làm cân bằng dịch chuyển theo chiều thu nhiệt. Chọn A."
        },
        {
          id: "hoahoc11_b1_mcq03",
          type: "mcq",
          question: "Cho cân bằng: $N_2(g) + 3H_2(g) \\rightleftharpoons 2NH_3(g)$ có $\\Delta H < 0$. Yếu tố nào làm cân bằng chuyển dịch sang chiều thuận?",
          options: [
            "Tăng áp suất của hệ",
            "Tăng nhiệt độ của hệ",
            "Giảm nồng độ khí $N_2$",
            "Thêm chất xúc tác"
          ],
          correct: 0,
          explanation: "Tăng áp suất dịch chuyển về phía ít mol khí hơn (chiều thuận). Chọn A."
        },
        {
          id: "hoahoc11_b1_mcq04",
          type: "mcq",
          question: "Hằng số cân bằng $K_C$ của phản ứng chỉ phụ thuộc vào:",
          options: [
            "Bản chất của phản ứng và nhiệt độ",
            "Áp suất của hệ",
            "Nồng độ ban đầu của chất tham gia",
            "Chất xúc tác"
          ],
          correct: 0,
          explanation: "$K_C$ chỉ phụ thuộc vào bản chất phản ứng và nhiệt độ. Chọn A."
        },
        {
          id: "hoahoc11_b1_mcq05",
          type: "mcq",
          question: "Biểu thức hằng số cân bằng $K_C$ của phản ứng $C(s) + CO_2(g) \\rightleftharpoons 2CO(g)$ là:",
          options: [
            "$K_C = \\frac{[CO]^2}{[CO_2]}$",
            "$K_C = \\frac{[CO]^2}{[C][CO_2]}$",
            "$K_C = \\frac{[CO_2]}{[CO]^2}$",
            "$K_C = \\frac{2[CO]}{[CO_2]}$"
          ],
          correct: 0,
          explanation: "Nồng độ chất rắn (C) là hằng số và không xuất hiện trong biểu thức $K_C$. Chọn A."
        },
        {
          id: "hoahoc11_b1_sa01",
          type: "shortanswer",
          question: "Dung dịch $\\text{HCl}$ có nồng độ $0{,}01$ M. Giá trị pH của dung dịch này bằng bao nhiêu?",
          correctAnswer: "2",
          explanation: "$[H^+] = 10^{-2}$ M $\\Rightarrow \\text{pH} = 2$. Đáp án: 2."
        },
        {
          id: "hoahoc11_b1_sa02",
          type: "shortanswer",
          question: "Dung dịch $\\text{NaOH}$ có nồng độ $0{,}001$ M. Giá trị pH của dung dịch ở $25^\\circ\\text{C}$ là bao nhiêu?",
          correctAnswer: "11",
          explanation: "$[OH^-] = 10^{-3} \\Rightarrow \\text{pOH} = 3 \\Rightarrow \\text{pH} = 14 - 3 = 11$. Đáp án: 11."
        }
      ],
      questionGroups: [
        {
          id: "hoahoc11_b1_tf01",
          type: "tf-group",
          passage: "Xét hệ cân bằng trong bình kín: $2SO_2(g) + O_2(g) \\rightleftharpoons 2SO_3(g)$ với $\\Delta_r H^0_{298} < 0$.",
          statements: [
            {
              question: "a) Biểu thức hằng số cân bằng $K_C = \\frac{[SO_3]^2}{[SO_2]^2 [O_2]}$.",
              correct: true
            },
            {
              question: "b) Tăng nồng độ $O_2$ làm cân bằng chuyển dịch theo chiều thuận.",
              correct: true
            },
            {
              question: "c) Giảm nhiệt độ làm tăng hiệu suất tạo thành $SO_3$.",
              correct: true
            },
            {
              question: "d) Thêm chất xúc tác $V_2O_5$ làm tăng giá trị của hằng số cân bằng $K_C$.",
              correct: false
            }
          ],
          explanation: "a, b, c đúng. Chất xúc tác không làm thay đổi hằng số cân bằng (d sai)."
        }
      ]
    },
    {
      id: 2,
      bai: 2,
      name: "Bài 2: Sự điện li, thuyết Brønsted - Lowry và pH",
      topic: "CHỦ ĐỀ 1: CÂN BẰNG HÓA HỌC",
      questions: [
        {
          id: "hoahoc11_b2_mcq01",
          type: "mcq",
          question: "Theo thuyết Brønsted - Lowry, base là chất:",
          options: [
            "Có khả năng nhận proton ($H^+$)",
            "Có khả năng cho proton ($H^+$)",
            "Phân li ra $OH^-$ trong nước",
            "Chứa nhóm -OH"
          ],
          correct: 0,
          explanation: "Base là chất nhận proton ($H^+$). Chọn A."
        },
        {
          id: "hoahoc11_b2_mcq02",
          type: "mcq",
          question: "Chất nào sau đây là chất điện li mạnh?",
          options: [
            "$\\text{NaOH}$",
            "$\\text{CH}_3\\text{COOH}$",
            "$\\text{H}_2\\text{O}$",
            "$\\text{HF}$"
          ],
          correct: 0,
          explanation: "$\\text{NaOH}$ là base mạnh điện li hoàn toàn. Chọn A."
        },
        {
          id: "hoahoc11_b2_mcq03",
          type: "mcq",
          question: "Dung dịch có pH < 7 ở $25^\\circ\\text{C}$ có môi trường:",
          options: [
            "Acid",
            "Base",
            "Trung tính",
            "Lưỡng tính"
          ],
          correct: 0,
          explanation: "pH < 7 là môi trường acid. Chọn A."
        },
        {
          id: "hoahoc11_b2_mcq04",
          type: "mcq",
          question: "Giá trị tích số ion của nước $K_w = [H^+][OH^-]$ ở $25^\\circ\\text{C}$ bằng:",
          options: [
            "$1{,}0 \\cdot 10^{-14}$",
            "$1{,}0 \\cdot 10^{-7}$",
            "$1{,}0 \\cdot 10^{-1}$",
            "$1{,}0 \\cdot 10^{-12}$"
          ],
          correct: 0,
          explanation: "Tích số ion của nước ở 25 độ C là hằng số bằng $10^{-14}$. Chọn A."
        },
        {
          id: "hoahoc11_b2_mcq05",
          type: "mcq",
          question: "Chất nào sau đây là chất điện li yếu trong nước?",
          options: [
            "$\\text{CH}_3\\text{COOH}$",
            "$\\text{NaCl}$",
            "$\\text{KOH}$",
            "$\\text{HNO}_3$"
          ],
          correct: 0,
          explanation: "$\\text{CH}_3\\text{COOH}$ là acid hữu cơ yếu, điện li một phần. Chọn A."
        },
        {
          id: "hoahoc11_b2_sa01",
          type: "shortanswer",
          question: "Trộn 100 mL dung dịch $\\text{HCl } 0{,}1$ M với 100 mL dung dịch $\\text{NaOH } 0{,}1$ M. Giá trị pH của dung dịch sau phản ứng là bao nhiêu?",
          correctAnswer: "7",
          explanation: "Phản ứng trung hòa hoàn toàn giữa acid mạnh và base mạnh tạo môi trường trung tính pH = 7. Đáp án: 7."
        },
        {
          id: "hoahoc11_b2_sa02",
          type: "shortanswer",
          question: "Pha loãng $10$ mL dung dịch $\\text{HCl}$ có pH = 2 thành $100$ mL bằng nước cất. Giá trị pH của dung dịch sau khi pha loãng là bao nhiêu?",
          correctAnswer: "3",
          explanation: "Pha loãng 10 lần làm nồng độ $H^+$ giảm 10 lần, pH tăng 1 đơn vị từ 2 lên 3. Đáp án: 3."
        }
      ],
      questionGroups: [
        {
          id: "hoahoc11_b2_tf01",
          type: "tf-group",
          passage: "Cho các dung dịch có cùng nồng độ mol $0{,}1$ M: (1) $\\text{HCl}$, (2) $\\text{CH}_3\\text{COOH}$, (3) $\\text{NaCl}$, (4) $\\text{NaOH}$.",
          statements: [
            {
              question: "a) Dung dịch (1) dẫn điện tốt hơn dung dịch (2).",
              correct: true
            },
            {
              question: "b) pH của dung dịch (4) bằng 13.",
              correct: true
            },
            {
              question: "c) Dung dịch (3) làm quỳ tím đổi sang màu đỏ.",
              correct: false
            },
            {
              question: "d) Thứ tự pH tăng dần là (1) < (2) < (3) < (4).",
              correct: true
            }
          ],
          explanation: "a, b, d đúng. $\\text{NaCl}$ trung tính không đổi màu quỳ tím (c sai)."
        }
      ]
    },
    {
      id: 3,
      bai: 3,
      name: "Bài 3: Đơn chất Nitrogen và các hợp chất vô cơ của Nitrogen",
      topic: "CHỦ ĐỀ 2: NITROGEN - SULFUR",
      questions: [
        {
          id: "hoahoc11_b3_mcq01",
          type: "mcq",
          question: "Khí nitrogen ($N_2$) khá trơ về mặt hóa học ở nhiệt độ thường là do:",
          options: [
            "Phân tử có liên kết ba bền vững",
            "Nitrogen có độ âm điện lớn",
            "Bán kính nguyên tử nhỏ",
            "Nitrogen không có liên kết hóa học"
          ],
          correct: 0,
          explanation: "Liên kết ba $N \\equiv N$ có năng lượng liên kết rất lớn ($945$ kJ/mol) nên rất bền. Chọn A."
        },
        {
          id: "hoahoc11_b3_mcq02",
          type: "mcq",
          question: "Khí ammonia ($\\text{NH}_3$) làm quỳ tím ẩm chuyển sang màu:",
          options: [
            "Xanh",
            "Đỏ",
            "Không đổi màu",
            "Mất màu"
          ],
          correct: 0,
          explanation: "Ammonia có tính base tan trong nước tạo ion $OH^-$, làm quỳ tím hóa xanh. Chọn A."
        },
        {
          id: "hoahoc11_b3_mcq03",
          type: "mcq",
          question: "Kim loại nào sau đây thụ động trong dung dịch $\\text{HNO}_3$ đặc, nguội?",
          options: [
            "Al và Fe",
            "Cu và Ag",
            "Zn và Mg",
            "Na và K"
          ],
          correct: 0,
          explanation: "Al, Fe, Cr thụ động trong $\\text{HNO}_3$ và $\\text{H}_2\\text{SO}_4$ đặc nguội. Chọn A."
        },
        {
          id: "hoahoc11_b3_mcq04",
          type: "mcq",
          question: "Trong công nghiệp, phần lớn lượng nitrogen sản xuất ra được dùng để:",
          options: [
            "Tổng hợp ammonia",
            "Sản xuất rượu bia",
            "Bảo quản thực phẩm tươi",
            "Luyện kim nhôm"
          ],
          correct: 0,
          explanation: "Phần lớn nitrogen dùng để tổng hợp ammonia cho ngành phân bón. Chọn A."
        },
        {
          id: "hoahoc11_b3_mcq05",
          type: "mcq",
          question: "Khí nào sau đây có mùi khai và xốc đặc trưng, tan rất nhiều trong nước?",
          options: [
            "$\\text{NH}_3$",
            "$\\text{NO}_2$",
            "$\\text{SO}_2$",
            "$\\text{CO}_2$"
          ],
          correct: 0,
          explanation: "Ammonia có mùi khai xốc đặc trưng. Chọn A."
        },
        {
          id: "hoahoc11_b3_sa01",
          type: "shortanswer",
          question: "Số oxi hóa của nguyên tử Nitrogen trong phân tử $\\text{HNO}_3$ bằng bao nhiêu?",
          correctAnswer: "5",
          explanation: "Trong $\\text{HNO}_3$, H là +1, O là -2 $\\Rightarrow 1 + x + 3(-2) = 0 \\Rightarrow x = +5$. Đáp án: 5."
        },
        {
          id: "hoahoc11_b3_sa02",
          type: "shortanswer",
          question: "Nhiệt phân hoàn toàn $8$ gam $\\text{NH}_4\\text{NO}_3$ thu được bao nhiêu lít khí $\\text{N}_2\\text{O}$ ở điều kiện chuẩn ($24{,}79$ L/mol)?",
          correctAnswer: "2.479",
          explanation: "$n = 8/80 = 0{,}1$ mol. $\\text{NH}_4\\text{NO}_3 \\to \\text{N}_2\\text{O} + 2\\text{H}_2\\text{O}$. $V = 0{,}1 \\times 24{,}79 = 2{,}479$ L. Đáp án: 2.479."
        }
      ],
      questionGroups: [
        {
          id: "hoahoc11_b3_tf01",
          type: "tf-group",
          passage: "Ammonia ($\\text{NH}_3$) là một hợp chất quan trọng của nitrogen trong công nghiệp phân bón.",
          statements: [
            {
              question: "a) Phân tử $\\text{NH}_3$ có dạng hình chóp tam giác.",
              correct: true
            },
            {
              question: "b) $\\text{NH}_3$ thể hiện tính khử khi tác dụng với khí oxygen.",
              correct: true
            },
            {
              question: "c) Khí $\\text{NH}_3$ nặng hơn không khí.",
              correct: false
            },
            {
              question: "d) $\\text{NH}_3$ phản ứng với acid tạo thành muối ammonium.",
              correct: true
            }
          ],
          explanation: "$M = 17 < 29$ nên ammonia nhẹ hơn không khí (c sai)."
        }
      ]
    },
    {
      id: 4,
      bai: 4,
      name: "Bài 4: Sulfur, Sulfuric acid và Hợp chất hữu cơ",
      topic: "CHỦ ĐỀ 2 & 3: SULFUR VÀ ĐẠI CƯƠNG HÓA HỮU CƠ",
      questions: [
        {
          id: "hoahoc11_b4_mcq01",
          type: "mcq",
          question: "Để pha loãng dung dịch $\\text{H}_2\\text{SO}_4$ đặc an toàn, người ta phải:",
          options: [
            "Rót từ từ acid đặc vào nước và khuấy nhẹ",
            "Rót từ từ nước vào acid đặc",
            "Rót nhanh nước vào acid đặc",
            "Đổ đồng thời acid và nước vào nhau"
          ],
          correct: 0,
          explanation: "Rót từ từ acid vào nước để tránh tỏa nhiệt làm sôi acid bắn ra ngoài gây bỏng. Chọn A."
        },
        {
          id: "hoahoc11_b4_mcq02",
          type: "mcq",
          question: "Khí nào sau đây là nguyên nhân chính gây ra hiện tượng mưa acid?",
          options: [
            "$\\text{SO}_2$ và $\\text{NO}_x$",
            "$\\text{CH}_4$",
            "$\\text{CO}$",
            "$\\text{N}_2$"
          ],
          correct: 0,
          explanation: "$\\text{SO}_2$ và các oxide của nitrogen gây mưa acid. Chọn A."
        },
        {
          id: "hoahoc11_b4_mcq03",
          type: "mcq",
          question: "Liên kết hóa học chủ yếu trong phân tử hợp chất hữu cơ là:",
          options: [
            "Liên kết cộng hóa trị",
            "Liên kết ion",
            "Liên kết kim loại",
            "Liên kết hydrogen"
          ],
          correct: 0,
          explanation: "Hợp chất hữu cơ chủ yếu chứa liên kết cộng hóa trị. Chọn A."
        },
        {
          id: "hoahoc11_b4_mcq04",
          type: "mcq",
          question: "Chất nào sau đây là một hợp chất hữu cơ?",
          options: [
            "$\\text{CH}_4$",
            "$\\text{CO}_2$",
            "$\\text{CaCO}_3$",
            "$\\text{NaCN}$"
          ],
          correct: 0,
          explanation: "$\\text{CH}_4$ (methane) là hydrocarbon hữu cơ. Các chất $CO_2, CaCO_3, NaCN$ là hợp chất vô cơ. Chọn A."
        },
        {
          id: "hoahoc11_b4_mcq05",
          type: "mcq",
          question: "Khoáng vật thạch cao sống có công thức hóa học là:",
          options: [
            "$\\text{CaSO}_4 \\cdot 2\\text{H}_2\\text{O}$",
            "$\\text{CaSO}_4 \\cdot \\text{H}_2\\text{O}$",
            "$\\text{MgSO}_4 \\cdot 7\\text{H}_2\\text{O}$",
            "$\\text{BaSO}_4$"
          ],
          correct: 0,
          explanation: "Thạch cao sống là $\\text{CaSO}_4 \\cdot 2\\text{H}_2\\text{O}$. Chọn A."
        },
        {
          id: "hoahoc11_b4_sa01",
          type: "shortanswer",
          question: "Đốt cháy hoàn toàn một hydrocarbon $X$ thu được $0{,}2$ mol $\\text{CO}_2$ và $0{,}3$ mol $\\text{H}_2\\text{O}$. Số nguyên tử carbon trong phân tử $X$ là bao nhiêu nếu $X$ có công thức dạng $\\text{C}_n\\text{H}_{2n+2}$?",
          correctAnswer: "2",
          explanation: "$n_{H_2O} - n_{CO_2} = 0{,}1$ mol = $n_X$. Số C = $0{,}2 / 0{,}1 = 2$ (phân tử $\\text{C}_2\\text{H}_6$). Đáp án: 2."
        },
        {
          id: "hoahoc11_b4_sa02",
          type: "shortanswer",
          question: "Hóa trị của nguyên tố Carbon trong các hợp chất hữu cơ luôn luôn bằng bao nhiêu?",
          correctAnswer: "4",
          explanation: "Trong hợp chất hữu cơ, Carbon luôn có hóa trị IV. Đáp án: 4."
        }
      ],
      questionGroups: [
        {
          id: "hoahoc11_b4_tf01",
          type: "tf-group",
          passage: "Sulfuric acid đặc ($\\text{H}_2\\text{SO}_4$) là một trong những hóa chất công nghiệp quan trọng hàng đầu.",
          statements: [
            {
              question: "a) $\\text{H}_2\\text{SO}_4$ đặc có tính háo nước mạnh.",
              correct: true
            },
            {
              question: "b) $\\text{H}_2\\text{SO}_4$ đặc nóng có thể oxi hóa được kim loại đồng (Cu).",
              correct: true
            },
            {
              question: "c) Dung dịch muối $\\text{BaCl}_2$ dùng để nhận biết ion sulfate $\\text{SO}_4^{2-}$.",
              correct: true
            },
            {
              question: "d) Khi tác dụng với đường sucrose, acid làm đường chuyển thành màu vàng óng.",
              correct: false
            }
          ],
          explanation: "Tính háo nước biến đường thành khối than đen carbon xốp (d sai)."
        }
      ]
    }
  ]
};

// ═══════════════════════════════════════════════════════════════
// 4. TIẾNG ANH 11 (GDPT 2018 - Global Success: 40+ MCQ)
// ═══════════════════════════════════════════════════════════════
const tienganh11Data = {
  subject: "Tiếng Anh 11",
  subjectKey: "tienganh",
  grade: 11,
  curriculum: "GDPT 2018 — QĐ 764/QĐ-BGDĐT",
  source: "Ngân hàng đề thi chuẩn hóa THPT & Kho học liệu mở (Global Success 11)",
  lessons: [
    {
      id: 1,
      bai: 1,
      name: "Unit 1: A Long and Healthy Life",
      topic: "THEME 1: HEALTH AND WELLBEING",
      questions: [
        {
          id: "tienganh11_u1_mcq01",
          type: "mcq",
          question: "Mark the word whose underlined part differs in pronunciation:\nA. balanced\nB. relaxed\nC. regular\nD. habit",
          options: ["A. balanced", "B. relaxed", "C. regular", "D. habit"],
          correct: 2,
          explanation: "'regular' /e/, others /æ/. Correct: C."
        },
        {
          id: "tienganh11_u1_mcq02",
          type: "mcq",
          question: "Regular exercise and a ______ diet are essential for longevity.",
          options: ["balanced", "balance", "balancing", "imbalanced"],
          correct: 0,
          explanation: "'balanced diet' is a fixed collocation. Correct: A."
        },
        {
          id: "tienganh11_u1_mcq03",
          type: "mcq",
          question: "Antibiotics are only effective against infections caused by ______.",
          options: ["bacteria", "viruses", "muscles", "nutrients"],
          correct: 0,
          explanation: "Antibiotics treat bacteria. Correct: A."
        },
        {
          id: "tienganh11_u1_mcq04",
          type: "mcq",
          question: "I ______ to the gym three times last week.",
          options: ["went", "have gone", "go", "was going"],
          correct: 0,
          explanation: "Past simple with 'last week'. Correct: A."
        },
        {
          id: "tienganh11_u1_mcq05",
          type: "mcq",
          question: "She ______ a vegetarian since she read about healthy lifestyles.",
          options: ["has been", "was", "is", "had been"],
          correct: 0,
          explanation: "Present perfect with 'since'. Correct: A."
        },
        {
          id: "tienganh11_u1_mcq06",
          type: "mcq",
          question: "The doctor advised him to cut down ______ sugary drinks.",
          options: ["on", "with", "in", "of"],
          correct: 0,
          explanation: "Cut down on: reduce. Correct: A."
        },
        {
          id: "tienganh11_u1_mcq07",
          type: "mcq",
          question: "Life ______ has increased significantly due to medical advancements.",
          options: ["expectancy", "expectation", "expectant", "expecting"],
          correct: 0,
          explanation: "'Life expectancy' (tuổi thọ kỳ vọng). Correct: A."
        },
        {
          id: "tienganh11_u1_mcq08",
          type: "mcq",
          question: "Eating plenty of fresh vegetables strengthens your immune ______.",
          options: ["system", "routine", "muscle", "organ"],
          correct: 0,
          explanation: "'Immune system' (hệ miễn dịch). Correct: A."
        },
        {
          id: "tienganh11_u1_mcq09",
          type: "mcq",
          question: "Have you ever ______ a medical check-up this year?",
          options: ["had", "did", "made", "taken"],
          correct: 0,
          explanation: "'Have a medical check-up'. Correct: A."
        },
        {
          id: "tienganh11_u1_mcq10",
          type: "mcq",
          question: "Drinking enough water helps flush out harmful ______ from the body.",
          options: ["toxins", "minerals", "vitamins", "proteins"],
          correct: 0,
          explanation: "Toxins (độc tố). Correct: A."
        },
        {
          id: "tienganh11_u1_mcq11",
          type: "mcq",
          question: "He ______ jogging every morning for five years.",
          options: ["has practiced", "practiced", "is practicing", "practices"],
          correct: 0,
          explanation: "Present perfect for action lasting up to present. Correct: A."
        }
      ],
      questionGroups: []
    },
    {
      id: 2,
      bai: 2,
      name: "Unit 2: The Generation Gap",
      topic: "THEME 2: SOCIETY AND RELATIONSHIPS",
      questions: [
        {
          id: "tienganh11_u2_mcq01",
          type: "mcq",
          question: "The generation gap often results from differences in ______ and values.",
          options: ["viewpoints", "height", "temperature", "color"],
          correct: 0,
          explanation: "Viewpoints and values. Correct: A."
        },
        {
          id: "tienganh11_u2_mcq02",
          type: "mcq",
          question: "You ______ stay out past your curfew. Your parents will worry.",
          options: ["mustn't", "don't have to", "should", "can"],
          correct: 0,
          explanation: "Mustn't: prohibition. Correct: A."
        },
        {
          id: "tienganh11_u2_mcq03",
          type: "mcq",
          question: "You ______ respect your elders in the family.",
          options: ["ought to", "mustn't", "can't", "would"],
          correct: 0,
          explanation: "Ought to: moral duty. Correct: A."
        },
        {
          id: "tienganh11_u2_mcq04",
          type: "mcq",
          question: "Grandparents often hold more ______ views compared to teenagers.",
          options: ["conservative", "modern", "digital", "fashionable"],
          correct: 0,
          explanation: "Conservative (truyền thống, bảo thủ). Correct: A."
        },
        {
          id: "tienganh11_u2_mcq05",
          type: "mcq",
          question: "Teenagers prefer to be ______ and make their own career choices.",
          options: ["independent", "depend", "dependent", "dependence"],
          correct: 0,
          explanation: "Adjective 'independent'. Correct: A."
        },
        {
          id: "tienganh11_u2_mcq06",
          type: "mcq",
          question: "Open communication helps ______ the generation gap.",
          options: ["bridge", "build", "widen", "destroy"],
          correct: 0,
          explanation: "'Bridge the gap' (thu hẹp khoảng cách). Correct: A."
        },
        {
          id: "tienganh11_u2_mcq07",
          type: "mcq",
          question: "You ______ wear a uniform on weekdays; it is a school rule.",
          options: ["have to", "may", "can", "ought"],
          correct: 0,
          explanation: "Have to: external rule. Correct: A."
        },
        {
          id: "tienganh11_u2_mcq08",
          type: "mcq",
          question: "Living in an extended family can lead to daily ______ over lifestyle habits.",
          options: ["conflicts", "peace", "agreements", "harmonies"],
          correct: 0,
          explanation: "Conflicts (mâu thuẫn). Correct: A."
        },
        {
          id: "tienganh11_u2_mcq09",
          type: "mcq",
          question: "Parents ______ impose their career ambitions on their children.",
          options: ["shouldn't", "must", "have to", "ought"],
          correct: 0,
          explanation: "Shouldn't: advice not to. Correct: A."
        },
        {
          id: "tienganh11_u2_mcq10",
          type: "mcq",
          question: "My grandmother is very ______ and always listens to my opinions.",
          options: ["open-minded", "narrow-minded", "strict", "rude"],
          correct: 0,
          explanation: "Open-minded (cởi mở). Correct: A."
        },
        {
          id: "tienganh11_u2_mcq11",
          type: "mcq",
          question: "A nuclear family consists ______ parents and their children.",
          options: ["of", "in", "with", "at"],
          correct: 0,
          explanation: "Consist of. Correct: A."
        }
      ],
      questionGroups: []
    },
    {
      id: 3,
      bai: 3,
      name: "Unit 3: Cities of the Future",
      topic: "THEME 3: SUSTAINABILITY AND SMART CITIES",
      questions: [
        {
          id: "tienganh11_u3_mcq01",
          type: "mcq",
          question: "Smart cities will rely on ______ energy sources like solar and wind.",
          options: ["renewable", "fossil", "exhaustible", "polluting"],
          correct: 0,
          explanation: "Renewable energy. Correct: A."
        },
        {
          id: "tienganh11_u3_mcq02",
          type: "mcq",
          question: "The rooftop garden ______ very refreshing after the rain.",
          options: ["smells", "is smelling", "smell", "has smelled"],
          correct: 0,
          explanation: "Linking verb 'smell' does not take continuous form here. Correct: A."
        },
        {
          id: "tienganh11_u3_mcq03",
          type: "mcq",
          question: "More ______ zones will be established so citizens can stroll safely.",
          options: ["pedestrian", "industrial", "highway", "aviation"],
          correct: 0,
          explanation: "Pedestrian zone (khu đi bộ). Correct: A."
        },
        {
          id: "tienganh11_u3_mcq04",
          type: "mcq",
          question: "High-rise buildings in eco-cities are designed to be energy-______.",
          options: ["efficient", "consuming", "wasting", "exhausting"],
          correct: 0,
          explanation: "Energy-efficient (tiết kiệm năng lượng). Correct: A."
        },
        {
          id: "tienganh11_u3_mcq05",
          type: "mcq",
          question: "Public transport in future cities ______ by artificial intelligence.",
          options: ["will be operated", "operated", "operates", "was operated"],
          correct: 0,
          explanation: "Passive voice in simple future. Correct: A."
        },
        {
          id: "tienganh11_u3_mcq06",
          type: "mcq",
          question: "Residents can report municipal issues via their mobile ______.",
          options: ["applications", "traffic", "pollution", "rubbish"],
          correct: 0,
          explanation: "Mobile applications. Correct: A."
        },
        {
          id: "tienganh11_u3_mcq07",
          type: "mcq",
          question: "Urban ______ is a major challenge when rural citizens flock to metropolises.",
          options: ["overcrowding", "emptiness", "reduction", "silence"],
          correct: 0,
          explanation: "Overcrowding (quá tải dân số). Correct: A."
        },
        {
          id: "tienganh11_u3_mcq08",
          type: "mcq",
          question: "Green spaces promote both physical and ______ wellbeing.",
          options: ["mental", "metallic", "mineral", "mechanic"],
          correct: 0,
          explanation: "Mental wellbeing (sức khỏe tinh thần). Correct: A."
        },
        {
          id: "tienganh11_u3_mcq09",
          type: "mcq",
          question: "The new transit system ______ impressive.",
          options: ["looks", "is looking", "look", "looking"],
          correct: 0,
          explanation: "Linking verb 'look'. Correct: A."
        },
        {
          id: "tienganh11_u3_mcq10",
          type: "mcq",
          question: "Modern smart grids help reduce electricity ______ during peak hours.",
          options: ["waste", "saving", "efficiency", "generation"],
          correct: 0,
          explanation: "Electricity waste. Correct: A."
        },
        {
          id: "tienganh11_u3_mcq11",
          type: "mcq",
          question: "Sensors will automatically detect and clean up ______ on the streets.",
          options: ["litter", "plants", "pedestrians", "clouds"],
          correct: 0,
          explanation: "Litter (rác thải). Correct: A."
        }
      ],
      questionGroups: []
    },
    {
      id: 4,
      bai: 4,
      name: "Unit 4: ASEAN and Viet Nam",
      topic: "THEME 4: GLOBAL INTEGRATION AND COOPERATION",
      questions: [
        {
          id: "tienganh11_u4_mcq01",
          type: "mcq",
          question: "Viet Nam officially became a member of ASEAN in ______.",
          options: ["1995", "1997", "1990", "2000"],
          correct: 0,
          explanation: "Viet Nam joined ASEAN on July 28, 1995. Correct: A."
        },
        {
          id: "tienganh11_u4_mcq02",
          type: "mcq",
          question: "ASEAN aims to promote regional peace, stability and economic ______.",
          options: ["growth", "decline", "isolation", "disruption"],
          correct: 0,
          explanation: "Economic growth. Correct: A."
        },
        {
          id: "tienganh11_u4_mcq03",
          type: "mcq",
          question: "The youth exchange program helps participants understand cultural ______.",
          options: ["diversity", "similarity", "division", "sameness"],
          correct: 0,
          explanation: "Cultural diversity (đa dạng văn hóa). Correct: A."
        },
        {
          id: "tienganh11_u4_mcq04",
          type: "mcq",
          question: "Member states work together to achieve common ______ in Southeast Asia.",
          options: ["goals", "fights", "arguments", "barriers"],
          correct: 0,
          explanation: "Common goals. Correct: A."
        },
        {
          id: "tienganh11_u4_mcq05",
          type: "mcq",
          question: "Viet Nam has contributed actively ______ all ASEAN activities.",
          options: ["to", "for", "with", "at"],
          correct: 0,
          explanation: "Contribute to something. Correct: A."
        },
        {
          id: "tienganh11_u4_mcq06",
          type: "mcq",
          question: "Students can apply for various educational ______ in ASEAN universities.",
          options: ["scholarships", "fines", "bills", "taxes"],
          correct: 0,
          explanation: "Scholarships (học bổng). Correct: A."
        },
        {
          id: "tienganh11_u4_mcq07",
          type: "mcq",
          question: "The charter emphasizes the principle of non-______ in internal affairs.",
          options: ["interference", "cooperation", "friendship", "solidarity"],
          correct: 0,
          explanation: "Non-interference (không can thiệp). Correct: A."
        },
        {
          id: "tienganh11_u4_mcq08",
          type: "mcq",
          question: "Tourism has blossomed thanks to visa-free ______ among member states.",
          options: ["travel", "quarantine", "barriers", "inspection"],
          correct: 0,
          explanation: "Visa-free travel. Correct: A."
        },
        {
          id: "tienganh11_u4_mcq09",
          type: "mcq",
          question: "They ______ for three hours before reaching an agreement.",
          options: ["had negotiated", "negotiate", "negotiating", "have negotiated"],
          correct: 0,
          explanation: "Past perfect before simple past. Correct: A."
        },
        {
          id: "tienganh11_u4_mcq10",
          type: "mcq",
          question: "The ASEAN emblem features ten stalks of ______ representing friendship.",
          options: ["padi", "bamboo", "lotus", "wheat"],
          correct: 0,
          explanation: "Ten stalks of padi (lúa). Correct: A."
        },
        {
          id: "tienganh11_u4_mcq11",
          type: "mcq",
          question: "Cultural festivals allow people to ______ their traditional heritage.",
          options: ["celebrate", "forget", "hide", "ignore"],
          correct: 0,
          explanation: "Celebrate heritage. Correct: A."
        },
        {
          id: "tienganh11_u4_mcq12",
          type: "mcq",
          question: "The ASEAN Community was officially formed on December 31, ______.",
          options: ["2015", "2010", "2020", "2005"],
          correct: 0,
          explanation: "Formed on Dec 31, 2015. Correct: A."
        }
      ],
      questionGroups: []
    }
  ]
};

// Write files
function writeBank(filename, data) {
  const target1 = path.join(DATA_DIR, filename);
  const target2 = path.join(PUBLIC_DATA_DIR, filename);

  fs.writeFileSync(target1, JSON.stringify(data, null, 2), 'utf8');
  console.log(`Saved: ${target1}`);

  if (fs.existsSync(PUBLIC_DATA_DIR)) {
    fs.writeFileSync(target2, JSON.stringify(data, null, 2), 'utf8');
    console.log(`Saved: ${target2}`);
  }
}

writeBank('toan11.json', toan11Data);
writeBank('vatli11.json', vatli11Data);
writeBank('hoahoc11.json', hoahoc11Data);
writeBank('tienganh11.json', tienganh11Data);

console.log('Complete authentic Grade 11 question banks generated successfully!');
