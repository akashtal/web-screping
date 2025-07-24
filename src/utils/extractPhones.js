export const extractPhones = (content) => {
  const phoneRegex = /(?:\+?\d{1,4}[\s.-]?)?\(?\d{2,5}\)?[\s.-]?\d{3,5}[\s.-]?\d{4,6}/g;
  const matches = content.match(phoneRegex) || [];
  return [...new Set(matches)].filter(phone => phone.replace(/\D/g, '').length >= 10);
};
