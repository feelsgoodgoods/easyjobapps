function createApplicationsTable() {
  db.run(`CREATE TABLE IF NOT EXISTS applications (
        id INTEGER PRIMARY KEY,
        company_post_id INTEGER,
        email TEXT,
        latex_resume TEXT,
        cover_letter TEXT,
        application_sent BOOLEAN DEFAULT FALSE,
        FOREIGN KEY(company_post_id) REFERENCES company_posts(id)
    )`, (err) => { logit(err, "applications") });
}

async function generateLaTeXResume(post, genericLaTeXResume) {
  const prompt = `Given the job posting "${post}" and a generic LaTeX resume "${genericLaTeXResume}", generate a specific LaTeX resume for the role.`;
  const response = await axios.post('https://api.openai.com/v1/engines/davinci/completions', {
    prompt: prompt,
    max_tokens: 500
  }, {
    headers: {
      'Authorization': `Bearer ${process.env.YOUR_OPENAI_API_KEY}`
    }
  });
  return response.data.choices[0].text.trim();
}

async function generateCoverLetter(post) {
  const prompt = `Given the job posting "${post}", generate a cover letter for the role.`;
  const response = await axios.post('https://api.openai.com/v1/chat/completions', {
    model: 'gpt-4-mini',
    prompt: prompt,
    max_tokens: 500
  }, {
    headers: {
      'Authorization': `Bearer ${process.env.YOUR_OPENAI_API_KEY}`
    }
  });
  return response.data.choices[0].text.trim();
}

async function processRecords() {
  db.all("SELECT * FROM company_posts WHERE is_fully_remote = 1 AND apply_to_email IS NOT NULL", async (err, rows) => {
    if (err) {
      res.status(500).send('Failed to fetch company posts.');
      return;
    }

    for (let row of rows) {
      const existingApplication = await new Promise(resolve => {
        db.get("SELECT id FROM applications WHERE company_post_id = ?", [row.id], (err, appRow) => {
          resolve(appRow);
        });
      });

      if (!existingApplication) {
        const latexResume = await utils.generateLaTeXResume(row.content, fs.readFileSync('completeres.txt', 'utf8'));
        const coverLetter = await utils.generateCoverLetter(row.content);
        db.run("INSERT INTO applications (company_post_id, latex_resume, cover_letter) VALUES (?, ?, ?)",
          [row.id, latexResume, coverLetter]);
      }
    }

    res.send('Processed company posts successfully!');
  });
}