export const MINIMUMS = {
    oneToOnePerMonth: 8,
    referralsPerMonth: 6,
    visitorsPerMonth: 1,
    trainingsPerMonth: 1,
    businessPerMonth: 300000,
    testimonialsIn6Months: 2
} as const;

// Helper type for indexing
type MinKeys = 'oneToOne' | 'referrals' | 'visitors' | 'trainings' | 'business' | 'testimonials';

// Function to safely get monthly minimum
export const getMinimum = (key: MinKeys): number => {
    if (key === 'testimonials') return MINIMUMS.testimonialsIn6Months / 6; // distribute over 6 months
    return MINIMUMS[`${key}PerMonth` as keyof typeof MINIMUMS] / 2; // half-month
};

export const MAX_POINTS = {
    oneToOne: 10,
    referrals: 15,
    visitors: 20,
    trainings: 15,
    business: 20,
    testimonials: 10,
    attendance: 7.5,
    onTime: 7.5
} as const;
