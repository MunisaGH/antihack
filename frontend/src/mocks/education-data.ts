// ============================================================
// Ta'lim sohasiga oid MOCK DATA — vaqtinchalik demo uchun
// VITE_USE_MOCK=true bo'lganda ishlatiladi
// ============================================================

export const EDUCATION_MOCK_ANALYTICS = {
  applications: 1247,
  average_compatibility_score: 74,
  activeVacancies: 32,
  interview_success_rate: 68,

  applications_by_status: [
    { status: 'pending',           count: 312 },
    { status: 'reviewing',         count: 187 },
    { status: 'interview_stage',   count: 143 },
    { status: 'hired',             count: 198 },
    { status: 'rejected_resume',   count: 256 },
    { status: 'rejected_interview',count: 89  },
    { status: 'saved',             count: 62  },
  ],

  top_vacancies: [
    { id: '1', title: "Matematika o'qituvchisi",              applications_count: 214 },
    { id: '2', title: "Boshlang'ich sinf o'qituvchisi",       applications_count: 187 },
    { id: '3', title: "Ingliz tili o'qituvchisi",             applications_count: 156 },
    { id: '4', title: "Informatika o'qituvchisi",             applications_count: 134 },
    { id: '5', title: "Maktabgacha ta'lim tarbiyachisi",      applications_count: 112 },
    { id: '6', title: "Kimyo va biologiya o'qituvchisi",      applications_count: 98  },
    { id: '7', title: "Maktab psixologi",                     applications_count: 76  },
    { id: '8', title: "Jismoniy tarbiya o'qituvchisi",        applications_count: 71  },
    { id: '9', title: "O'zbek tili va adabiyot o'qituvchisi", applications_count: 67  },
    { id: '10',title: "Tarix o'qituvchisi",                   applications_count: 54  },
  ],

  // Har bir vakansiya uchun tumanlar bo'yicha statistika
  vacancy_district_stats: {
    '1': [
      { district: "Toshkent shahri",      count: 48 },
      { district: "Samarqand viloyati",   count: 37 },
      { district: "Namangan viloyati",    count: 29 },
      { district: "Andijon viloyati",     count: 26 },
      { district: "Farg'ona viloyati",    count: 24 },
      { district: "Qashqadaryo viloyati", count: 21 },
      { district: "Buxoro viloyati",      count: 18 },
      { district: "Xorazm viloyati",      count: 11 },
    ],
    '2': [
      { district: "Toshkent shahri",      count: 42 },
      { district: "Andijon viloyati",     count: 31 },
      { district: "Farg'ona viloyati",    count: 28 },
      { district: "Samarqand viloyati",   count: 25 },
      { district: "Navoiy viloyati",      count: 19 },
      { district: "Sirdaryo viloyati",    count: 16 },
      { district: "Jizzax viloyati",      count: 14 },
      { district: "Surxondaryo viloyati", count: 12 },
    ],
    '3': [
      { district: "Toshkent shahri",      count: 54 },
      { district: "Toshkent viloyati",    count: 33 },
      { district: "Samarqand viloyati",   count: 22 },
      { district: "Farg'ona viloyati",    count: 19 },
      { district: "Namangan viloyati",    count: 16 },
      { district: "Buxoro viloyati",      count: 12 },
    ],
    '4': [
      { district: "Toshkent shahri",      count: 61 },
      { district: "Toshkent viloyati",    count: 28 },
      { district: "Samarqand viloyati",   count: 16 },
      { district: "Andijon viloyati",     count: 15 },
      { district: "Namangan viloyati",    count: 14 },
    ],
    '5': [
      { district: "Toshkent shahri",      count: 32 },
      { district: "Samarqand viloyati",   count: 21 },
      { district: "Andijon viloyati",     count: 18 },
      { district: "Farg'ona viloyati",    count: 16 },
      { district: "Navoiy viloyati",      count: 14 },
      { district: "Qashqadaryo viloyati", count: 11 },
    ],
  },
};

export const IS_MOCK_ENABLED = import.meta.env.VITE_USE_MOCK === 'true';
