export const MINIMUMS = {
    oneToOnePerMonth: 8,          // gives 10 pts
    referralsPerMonth: 6,         // gives 15 pts
    visitorsPerMonth: 1,          // gives 20 pts
    trainingsPerMonth: 1,         // gives 15 pts
    businessPerMonth: 300000,     // 18 lakhs / 6 months ≈ 3 Lakhs per month → gives 20 pts
    testimonialsPerMonth: 1,    // For monthly calculation we divide by 6
    attendancePerMonth:1
} as const;



/** ===========================
      MAXIMUM SCORE PER MONTH
===============================**/
export const MAX_POINTS = {
    oneToOne: 10,
    referrals: 15,
    visitors: 20,
    trainings: 15,
    business: 20,
    testimonials: 10,
    attendance: 10,   // your defined value
} as const;