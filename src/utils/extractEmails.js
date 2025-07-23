// Extracts unique, valid email addresses from a string of content
export const extractEmails = (content) => {
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  const matches = content.match(emailRegex) || [];
  // Filter out common placeholders and deduplicate
  return [...new Set(matches)].filter(email => 
    !email.includes('example.com') && 
    !email.includes('placeholder') &&
    !email.includes('yourname')
  );
};