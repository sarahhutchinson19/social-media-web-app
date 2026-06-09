/**
 * Article pool organized by category.
 * Adapted from innago_direct_social_post_with_images.py seed lists.
 * Titles are derived from URL slugs for display; real titles are fetched
 * from the Innago site at generation time for Claude's prompt.
 */

function slugToTitle(url) {
  const slug = url.replace(/^https?:\/\/innago\.com\//, '').replace(/\/$/, '');
  return slug
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export const CATEGORIES = {
  'Accounting & Finance': [
    'https://innago.com/accounting-best-practices-for-landlords/',
    'https://innago.com/9-tips-to-keep-good-financial-records-for-landlords/',
    'https://innago.com/landlords-and-tracking-rental-property-expenses-what-you-need-to-know/',
    'https://innago.com/7-reasons-to-have-separate-bank-accounts-for-your-rental-business/',
    'https://innago.com/financial-metrics-landlords-should-track/',
    'https://innago.com/what-is-rent-roll-and-why-is-it-important/',
    'https://innago.com/everything-you-need-to-know-about-accounting-as-a-landlord/',
    'https://innago.com/top-10-excel-templates-for-rental-property-finances/',
  ],
  'Leasing': [
    'https://innago.com/10-essential-lease-terms/',
    'https://innago.com/electronic-signatures-vs-digital-signatures/',
    'https://innago.com/month-to-month-lease-guide/',
    'https://innago.com/online-leases-how-they-work/',
    'https://innago.com/understanding-lease-addenda/',
    'https://innago.com/grace-periods-and-late-fees/',
    'https://innago.com/returning-the-security-deposit-common-concerns/',
    'https://innago.com/security-deposits-how-much-to-charge/',
    'https://innago.com/things-to-consider-renewing-lease/',
    'https://innago.com/subleasing-good-bad/',
    'https://innago.com/what-does-the-security-deposit-cover/',
    'https://innago.com/different-ways-to-structure-late-fees/',
  ],
  'Evictions': [
    'https://innago.com/how-to-evict-a-tenant/',
    'https://innago.com/what-is-the-cost-of-an-eviction/',
    'https://innago.com/6-legal-reasons-to-evict-a-tenant/',
    'https://innago.com/a-quick-guide-to-cash-for-keys/',
    'https://innago.com/how-to-prepare-for-an-eviction-court-hearing/',
    'https://innago.com/how-to-write-a-eviction-notice/',
    'https://innago.com/7-ways-to-avoid-evictions/',
    'https://innago.com/6-mistakes-landlords-make-during-evictions/',
    'https://innago.com/what-should-you-do-after-evicting-a-tenant/',
  ],
  'Tenant Screening': [
    'https://innago.com/benefits-screening-tenants/',
    'https://innago.com/tenant-screening-guide/',
    'https://innago.com/how-to-screen-tenants/',
    'https://innago.com/fair-housing-laws/',
    'https://innago.com/cost-skipping-tenant-screening/',
    'https://innago.com/understanding-background-checks/',
    'https://innago.com/hard-vs-soft-credit-inquiries/',
    'https://innago.com/interpreting-tenants-credit-report/',
    'https://innago.com/how-to-spot-fake-pay-stubs/',
    'https://innago.com/legal-reasons-to-deny-a-tenant-application/',
    'https://innago.com/best-tenant-screening-services-to-use-in-2024/',
  ],
  'Rent Collection': [
    'https://innago.com/should-landlords-waive-late-fees/',
    'https://innago.com/calculating-prorated-rent/',
    'https://innago.com/landlords-should-not-use-paypal-venmo-collect-rent/',
    'https://innago.com/online-payments-enhance-transparency/',
    'https://innago.com/online-rent-collection/',
    'https://innago.com/mobile-rent-collection/',
    'https://innago.com/ach-payments/',
    'https://innago.com/benefits-online-rent-collection/',
    'https://innago.com/how-often-can-landlords-raise-rent/',
  ],
  'Maintenance': [
    'https://innago.com/preventative-rental-maintenance-2/',
    'https://innago.com/preventative-rental-maintenance-1/',
    'https://innago.com/free-property-maintenance-checklist/',
    'https://innago.com/everything-you-need-to-know-about-mold-inspections/',
    'https://innago.com/landlords-guide-to-normal-vs-excessive-wear-and-tear/',
    'https://innago.com/who-is-responsible-for-smoke-and-carbon-monoxide-detectors-at-a-rental-property/',
    'https://innago.com/when-to-replace-floors-5-signs-that-its-time-for-a-rental-flooring-update/',
    'https://innago.com/what-to-do-if-your-pipes-are-frozen/',
  ],
  'Property Management Software': [
    'https://innago.com/how-to-choose-the-right-property-management-software/',
    'https://innago.com/core-features-property-management-software/',
    'https://innago.com/property-management-software-pricing-models/',
    'https://innago.com/best-property-management-software-for-2025/',
    'https://innago.com/5-best-free-property-management-software-for-small-landlords-in-2025/',
    'https://innago.com/software-what-is-property-management-software/',
    'https://innago.com/5-best-rent-collection-software-in-2025/',
  ],
  'Taxes': [
    'https://innago.com/the-basics-of-depreciation-for-landlords/',
    'https://innago.com/4-things-you-need-to-know-about-taxes-as-a-landlord/',
    'https://innago.com/an-overview-of-deductions-for-landlords/',
    'https://innago.com/what-landlords-need-to-know-about-taxes/',
    'https://innago.com/how-to-complete-1099s-as-a-landlord/',
    'https://innago.com/key-2026-tax-deadlines-checklist-for-landlords/',
    'https://innago.com/the-difference-between-repairs-and-improvements-on-your-taxes/',
    'https://innago.com/understanding-landlord-tax-classifications/',
  ],
  'New Landlords': [
    'https://innago.com/buying-a-rental-property/',
    'https://innago.com/understanding-landlord-tenant-laws/',
    'https://innago.com/preparing-your-rental-property-for-tenants/',
    'https://innago.com/determining-the-rent-amount-to-charge/',
    'https://innago.com/marketing-your-rental-property/',
    'https://innago.com/everything-you-need-to-know-as-a-new-landlord/',
    'https://innago.com/landlord-insurance-what-is-it-and-do-you-need-it/',
    'https://innago.com/10-steps-to-rent-home-2025/',
  ],
  'Increasing Revenue': [
    'https://innago.com/amenities-increase-revenue/',
    'https://innago.com/ways-to-minimize-tenant-turnover/',
    'https://innago.com/minimize-vacancy-time-on-rental-properties/',
    'https://innago.com/8-ways-landlords-lower-utility-costs/',
    'https://innago.com/reduce-rental-expenses-rental-properties/',
    'https://innago.com/ways-landlords-can-add-revenue-streams/',
    'https://innago.com/high-tech-features-increase-rent-price/',
  ],
  'Rental Management': [
    'https://innago.com/tenant-communication-importance/',
    'https://innago.com/landlord-checklist-for-leasing-your-first-property/',
    'https://innago.com/essential-property-inspection-checklists-for-landlords/',
    'https://innago.com/what-landlords-need-to-know-about-squatters-rights/',
    'https://innago.com/6-types-of-bad-tenants-and-how-to-approach-each-as-a-landlord/',
    'https://innago.com/a-complete-list-of-security-deposit-deductions/',
    'https://innago.com/5-reasons-to-centralize-your-real-estate-data/',
    'https://innago.com/how-to-write-a-friendly-rent-increase-letter/',
  ],
  'Property Listings': [
    'https://innago.com/landlords-guide-to-rental-property-listings/',
    'https://innago.com/how-to-create-a-rental-listing/',
    'https://innago.com/best-listing-sites/',
    'https://innago.com/10-ways-to-make-your-rental-listings-more-competitive/',
    'https://innago.com/perfect-rental-listing-photos/',
    'https://innago.com/create-virtual-tour-for-rental-property/',
  ],
  'Real Estate Investing': [
    'https://innago.com/the-advantages-and-risks-of-1031-exchanges/',
    'https://innago.com/roi-for-rental-properties-and-why-it-matters/',
    'https://innago.com/the-brrrr-method-of-real-estate-investing/',
    'https://innago.com/cash-on-cash-return-how-and-why-to-calculate-it-for-real-estate/',
    'https://innago.com/best-types-of-real-estate-investments-for-2024/',
    'https://innago.com/why-you-should-start-investing-in-duplexes-and-triplexes/',
    'https://innago.com/top-5-most-landlord-friendly-states-to-invest-in/',
  ],
  'Pets': [
    'https://innago.com/service-emotional-support-animals-rental/',
    'https://innago.com/guide-renting-tenants-pets-2/',
    'https://innago.com/allow-tenants-pets/',
    'https://innago.com/difference-between-pet-fees-pet-deposit-pet-rent/',
    'https://innago.com/pet-policies-why-you-need-one-and-what-to-include/',
    'https://innago.com/how-to-handle-tenants-with-unauthorized-pets/',
  ],
  'Section 8 / Affordable Housing': [
    'https://innago.com/how-to-become-a-section-8-housing-landlord/',
    'https://innago.com/the-advantages-and-risks-of-becoming-a-section-8-landlord/',
    'https://innago.com/8-myths-about-renting-to-section-8-tenants/',
    'https://innago.com/how-to-screen-section-8-tenants/',
    'https://innago.com/how-to-evict-a-section-8-tenant/',
  ],
};

/** Flat array of all articles with category label */
export const ALL_ARTICLES = Object.entries(CATEGORIES).flatMap(([category, urls]) =>
  urls.map((url) => ({
    url,
    category,
    slug: url.replace(/^https?:\/\/innago\.com\//, '').replace(/\/$/, ''),
    displayTitle: slugToTitle(url),
  }))
);

/** Pick articles for a schedule, rotating through categories */
export function pickArticlesForSchedule(slots, selectedCategories = null) {
  const pool = selectedCategories
    ? ALL_ARTICLES.filter((a) => selectedCategories.includes(a.category))
    : ALL_ARTICLES;

  if (pool.length === 0) return slots.map((s, i) => ({ ...s, article: ALL_ARTICLES[i % ALL_ARTICLES.length] }));

  // Shuffle pool deterministically with a seed based on today's date
  const seed = new Date().toISOString().slice(0, 10);
  const shuffled = [...pool].sort((a, b) => {
    const ha = hashCode(a.url + seed);
    const hb = hashCode(b.url + seed);
    return ha - hb;
  });

  return slots.map((slot, i) => ({
    ...slot,
    article: shuffled[i % shuffled.length],
  }));
}

function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0;
  }
  return hash;
}
