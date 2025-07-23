// Extracts unique, valid phone numbers from a string of content
export const extractPhones = (content) => {
  const phoneRegex = /(\+?\d{1,4}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g;
  const matches = content.match(phoneRegex) || [];
  // Deduplicate and filter for reasonable length
  return [...new Set(matches)].filter(phone => phone.length >= 10);
};