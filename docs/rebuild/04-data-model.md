# NTMK REBUILD — DATA SCHEMAS & ADAPTIVE MODEL ARCHITECTURE
**Tài liệu:** `docs/rebuild/04-data-model.md`  
**Dự án:** NTMK — Nền tảng Ôn Tập Thông Minh  
**Chương trình:** GDPT 2018 & Quyết định 764/QĐ-BGDĐT  
**Phạm vi:** Định nghĩa kiểu dữ liệu (TypeScript Interfaces), Schemas ngân hàng câu hỏi, Mô hình thích ứng và Đặc tả Ingestion Pipeline

---

## 1. MÔ HÌNH PHÂN CẤP CHƯƠNG TRÌNH HỌC (CURRICULUM TAXONOMY)

Hệ thống phân cấp dữ liệu tri thức được chuẩn hóa theo mô hình 5 cấp độ:
```
Subject (Môn học)
   └── Grade (Khối lớp: 10, 11, 12)
         └── CurriculumTopic / Chapter (Chuyên đề / Chương / Bài học)
               └── Skill (Kỹ năng / Đơn vị kiến thức cụ thể)
                     └── Question (Câu hỏi đa định dạng)
```

### Phân định 2 chế độ luyện tập:
1. **School Practice Mode (Luyện tập học đường)**: Phân bổ theo Lớp và Chuyên đề/Bài học sách giáo khoa để phục vụ kiểm tra thường xuyên và giữa kỳ/cuối kỳ.
2. **Graduation Exam Mode (Luyện thi Tốt nghiệp THPT)**: Ma trận đề thi tích hợp toàn diện theo quy chuẩn của Bộ GD&ĐT với cấu trúc phiên bản theo năm.

---

## 2. QUY CHUẨN ĐỀ THI TỐT NGHIỆP THPT (THEO QUYẾT ĐỊNH 764/QĐ-BGDĐT)

Đề thi tốt nghiệp THPT từ năm 2025 áp dụng 3 dạng thức trắc nghiệm mới. Cấu hình tham chiếu không được hard-code vào giao diện mà được quản lý qua Exam Spec Model:

| Môn học | Phần I: Trắc nghiệm nhiều lựa chọn (MCQ) | Phần II: Trắc nghiệm Đúng/Sai (TF Group) | Phần III: Trắc nghiệm trả lời ngắn (Short Answer) | Tổng số lệnh hỏi | Thời gian làm bài |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Toán** | 12 câu (12 lệnh hỏi) | 4 câu (16 lệnh hỏi con) | 6 câu (6 lệnh hỏi) | 34 lệnh hỏi | **90 phút** |
| **Vật lí** | 18 câu (18 lệnh hỏi) | 4 câu (16 lệnh hỏi con) | 6 câu (6 lệnh hỏi) | 40 lệnh hỏi | **50 phút** |
| **Hóa học** | 18 câu (18 lệnh hỏi) | 4 câu (16 lệnh hỏi con) | 6 câu (6 lệnh hỏi) | 40 lệnh hỏi | **50 phút** |
| **Tiếng Anh** | 40 câu (40 lệnh hỏi) | 0 câu | 0 câu | 40 lệnh hỏi | **50 phút** |

---

## 3. TYPESCRIPT INTERFACES & DOMAIN CONTRACTS

```typescript
/**
 * 1. User Profile & Preferences
 */
export type GradeLevel = 10 | 11 | 12;

export type StudyGoalType = 
  | 'score_8_plus'       // Mục tiêu điểm 8 trở lên
  | 'graduation_pass'    // Tốt nghiệp THPT
  | 'university_exam'    // Thi đại học / ĐGNL
  | 'quick_review';      // Ôn tập nhanh kiểm tra

export interface UserProfile {
  id: string;                         // UUID hoặc Anonymous ID
  name?: string;
  grade: GradeLevel;                  // Khối lớp đang học (10, 11, 12)
  targetSubjects: string[];           // ID các môn quan tâm (vd: ['math', 'physics'])
  goal: StudyGoalType;                // Mục tiêu ôn tập
  onboardingCompleted: boolean;       // Đã hoàn thành onboarding chưa
  createdAt: string;                  // ISO 8601
  updatedAt: string;
}

/**
 * 2. Subject & Curriculum
 */
export interface Subject {
  id: string;                         // 'math' | 'physics' | 'chemistry' | 'english' | legacy 'su' | 'sinh' | 'tin'
  name: string;                       // 'Toán học', 'Vật lí', 'Hóa học', 'Tiếng Anh'
  shortName: string;                  // 'Toán', 'Lý', 'Hóa', 'Anh'
  gradeLevels: GradeLevel[];          // [10, 11, 12]
  icon: string;                       // Emoji hoặc Icon identifier
  color: string;                      // Hex color (vd: '#3b82f6')
  description: string;
  status: 'active' | 'in_development' | 'pending'; // Trạng thái dữ liệu
  legacyDataFile?: string;            // Phục vụ tương thích ngược (vd: 'su.json')
}

export interface CurriculumTopic {
  id: string;
  subjectId: string;
  grade: GradeLevel;
  chapterNumber: number;
  chapterTitle: string;
  order: number;
  title: string;                      // Vd: 'Bài 1: Mệnh đề toán học'
  description?: string;
  skillIds: string[];
  estimatedMinutes: number;
  status: 'ready' | 'draft';
}

export interface Skill {
  id: string;
  topicId: string;
  code: string;                       // Vd: 'MATH10-CH1-SK01'
  name: string;                       // 'Nhận biết mệnh đề toán học'
  cognitiveLevel: 'recognize' | 'understand' | 'apply' | 'high_apply'; // 4 mức độ nhận thức
  prerequisiteSkillIds?: string[];
}

/**
 * 3. Question Model (Đa định dạng GDPT 2018)
 */
export type QuestionFormat = 'multiple_choice' | 'true_false_group' | 'short_answer';

export interface MultipleChoicePayload {
  options: string[];                  // Mảng 4 phương án ['A', 'B', 'C', 'D']
  correctOptionIndex: number;         // 0..3
}

export interface TrueFalseStatement {
  id: string;
  statement: string;
  correct: boolean;                   // true = Đúng, false = Sai
  explanation?: string;
}

export interface TrueFalseGroupPayload {
  passage: string;                    // Đoạn tư liệu / đề dẫn
  statements: TrueFalseStatement[];   // Thông thường 4 phát biểu a, b, c, d
}

export interface ShortAnswerPayload {
  correctAnswers: string[];           // Các dạng biểu diễn hợp lệ (vd: ['12', '12.0', '12,0'])
  unit?: string;                      // Đơn vị đo (nếu có, vd: 'm/s')
  tolerance?: number;                 // Dung sai số học (nếu có)
}

export interface QuestionSource {
  sourceName: string;                 // Tên đơn vị / tài liệu nguồn
  sourceUrl?: string;                 // URL gốc
  license: 'public_domain' | 'cc_by' | 'educational_use' | 'internal';
  retrievedAt: string;                // ISO 8601
  verificationStatus: 'verified' | 'unverified' | 'flagged';
  verifiedBy?: string;
}

export interface QuestionAnswerPolicy {
  caseSensitive: boolean;
  normalizeSpaces: boolean;
  allowCommaDecimal: boolean;         // Hỗ trợ số thập phân dấu phẩy kiểu Việt Nam (3,14 = 3.14)
}

export interface Question {
  id: string;
  format: QuestionFormat;
  subjectId: string;
  grade: GradeLevel;
  topicId?: string;
  skillId?: string;
  curriculumVersion: 'GDPT2018' | 'GDPT2006';
  examYear?: number;
  cognitiveLevel: 'recognize' | 'understand' | 'apply' | 'high_apply';
  
  // Nội dung
  prompt: string;                     // Nội dung câu hỏi (hỗ trợ Markdown & Math LaTeX)
  imageUri?: string | null;
  explanation?: string;               // Hướng dẫn giải chi tiết
  
  // Dữ liệu theo định dạng
  mcqPayload?: MultipleChoicePayload;
  tfPayload?: TrueFalseGroupPayload;
  shortAnswerPayload?: ShortAnswerPayload;
  
  source: QuestionSource;
  answerPolicy: QuestionAnswerPolicy;
  status: 'published' | 'review' | 'archived';
  createdAt: string;
  updatedAt: string;
}

/**
 * 4. Assessment Session & Question Attempt
 */
export interface AssessmentSession {
  id: string;
  userId: string;
  subjectId: string;
  mode: 'school_practice' | 'graduation_exam' | 'diagnostic' | 'flashcard';
  status: 'in_progress' | 'submitted' | 'expired';
  durationSeconds: number;
  timeSpentSeconds: number;
  totalQuestions: number;
  startedAt: string;
  submittedAt?: string;
}

export interface QuestionAttempt {
  id: string;
  sessionId: string;
  questionId: string;
  userResponse: unknown;              // number | Record<number, boolean> | string
  isCorrect: boolean;
  scoreAwarded: number;               // Điểm đạt được
  maxScore: number;                   // Điểm tối đa
  timeSpentSeconds: number;
  attemptedAt: string;
}

/**
 * 5. Adaptive Mastery & Learning Plan
 */
export interface SkillMastery {
  userId: string;
  skillId: string;
  attemptsCount: number;
  correctCount: number;
  masteryScore: number;               // 0.0 -> 1.0 (0% -> 100%)
  lastPracticedAt: string;
  nextRecommendedReviewAt?: string;   // Spaced repetition schedule
}

export interface StudyTask {
  id: string;
  planId: string;
  topicId: string;
  skillId: string;
  taskType: 'practice' | 'diagnostic' | 'review_mistakes' | 'flashcard';
  title: string;
  targetQuestionCount: number;
  isCompleted: boolean;
  dueDate: string;
}

export interface LearningPlan {
  id: string;
  userId: string;
  subjectId: string;
  title: string;
  targetScore: number;
  examDate?: string;
  tasks: StudyTask[];
  overallProgressPercentage: number;  // Tính thực tế dựa trên số task hoàn thành
}
```

---

## 4. QUESTION INGESTION PIPELINE CONTRACT

Đường hướng hệ sinh thái tự động chuẩn hóa câu hỏi từ các nguồn mở hợp pháp:

```
[Registry of Open Educational Sources]
               │
               ▼
   [1. Ingestion Adapter]
      - Rate limit enforcement
      - Robots.txt compliance check
      - Content pull (REST / Open Data / Educational API)
               │
               ▼
     [2. Content Parser]
      - Detect MCQ patterns (A., B., C., D.)
      - Detect True/False statement groups (a), b), c), d))
      - Detect Short Answer blanks
      - LaTeX formula extraction ($...$ and $$...$$)
               │
               ▼
     [3. Schema Normalizer]
      - Map into Question Interface
      - Tag Curriculum Taxonomy (Subject, Grade, GDPT 2018)
      - Assign Cognitive Level heuristic
               │
               ▼
     [4. Quality Validator]
      - Check at least 1 correct answer
      - Check option uniqueness
      - Check image URL health
      - Sanitize untrusted markup (anti-XSS)
               │
               ▼
    [5. Question Bank Store]
      - Deduplication check (Hash based)
      - Store into Verified or Pending-Review Partition
```
