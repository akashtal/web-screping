export const extractEmails = (content) => {
  const emailRegex = /([a-zA-Z0-9._%+-]+(?:\s*\[at\]|\s*@\s*|\s+at\s+)[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;
  const matches = content.match(emailRegex) || [];
  const cleaned = matches.map(email =>
    email
      .replace(/\s*\[at\]\s*/i, '@')
      .replace(/\s+at\s+/i, '@')
      .replace(/\s*@\s*/i, '@')
      .trim()
  );
  return [...new Set(cleaned)].filter(email =>
    !email.includes('example.com') &&
    !email.includes('yourname') &&
    !email.includes('placeholder')
  );
};
