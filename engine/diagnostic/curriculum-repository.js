/**
 * Curriculum Repository (GDPT 2018)
 * NTMK Rebuild Phase 03A — Task 1
 *
 * Responsibilities:
 * - Query curriculum skills, domains, and topics across subjects and grades.
 * - Distinguish national curriculum standards from specific textbook series (KNTT, CD, CTST).
 * - Enforce verification status tracking ('verified' vs 'unverified').
 */

const { CURRICULUM_DOMAINS, CURRICULUM_SKILLS } = require('./curriculum-taxonomy-data.js');

class CurriculumRepository {
  constructor(customSkills = null, customDomains = null) {
    this.skills = customSkills || CURRICULUM_SKILLS;
    this.domains = customDomains || CURRICULUM_DOMAINS;
    this.skillsById = new Map();
    this._initIndex();
  }

  _initIndex() {
    this.skillsById.clear();
    for (const skill of this.skills) {
      this.skillsById.set(skill.skillId, skill);
    }
  }

  getSkillById(skillId) {
    return this.skillsById.get(skillId) || null;
  }

  getAllSkills() {
    return [...this.skills];
  }

  getDomainsBySubject(subjectId) {
    return this.domains[subjectId] || [];
  }

  querySkills({ subjectId, grade, topicId, domainId, verificationStatus } = {}) {
    return this.skills.filter(s => {
      if (subjectId && s.subjectId !== subjectId) return false;
      if (grade !== undefined && grade !== null && Number(s.grade) !== Number(grade)) return false;
      if (topicId && s.topicId !== topicId) return false;
      if (domainId && s.domainId !== domainId) return false;
      if (verificationStatus && s.verificationStatus !== verificationStatus) return false;
      return true;
    });
  }

  getTopicsBySubjectAndGrade(subjectId, grade) {
    const skills = this.querySkills({ subjectId, grade });
    const topicMap = new Map();
    for (const s of skills) {
      if (!topicMap.has(s.topicId)) {
        topicMap.set(s.topicId, {
          topicId: s.topicId,
          topicTitle: s.topicTitle,
          subjectId: s.subjectId,
          grade: s.grade,
          domainId: s.domainId,
          skillIds: []
        });
      }
      topicMap.get(s.topicId).skillIds.push(s.skillId);
    }
    return Array.from(topicMap.values());
  }

  /**
   * Distinguish standard curriculum from specific textbook series mapping (KNTT, Canh Dieu, Chan Troi Sang Tao).
   * Notice: National GDPT 2018 is uniform, but chapter ordering varies by book.
   */
  getTextbookMapping(skillIdOrSubject, textbookSeriesOrGrade = 'KNTT', seriesOpt = null) {
    if (seriesOpt !== null) {
      const subjectId = skillIdOrSubject;
      const grade = textbookSeriesOrGrade;
      const series = String(seriesOpt).toLowerCase();
      const skills = this.querySkills({ subjectId, grade });
      return {
        subjectId,
        grade,
        series,
        chapters: this.getTopicsBySubjectAndGrade(subjectId, grade),
        totalSkills: skills.length,
        alignedWithNationalStandard: true,
        notice: `Chuẩn kiến thức GDPT 2018 được ánh xạ tương ứng vào bộ SGK ${series}.`
      };
    }

    const skill = this.getSkillById(skillIdOrSubject);
    if (!skill) return null;

    const seriesName = String(textbookSeriesOrGrade).toUpperCase();
    const isStandard = ['KNTT', 'CD', 'CTST'].includes(seriesName);

    return {
      skillId: skill.skillId,
      curriculumVersion: skill.curriculumVersion,
      series: seriesName.toLowerCase(),
      textbookSeries: isStandard ? seriesName : 'STANDARD_GDPT2018',
      alignedWithNationalStandard: true,
      chapterMappingNotice: `Kỹ năng thuộc chuẩn chương trình GDPT 2018; phân phối bài học có thể thay đổi tùy theo bộ SGK ${seriesName}.`
    };
  }
}

CurriculumRepository.CurriculumRepository = CurriculumRepository;
module.exports = CurriculumRepository;
