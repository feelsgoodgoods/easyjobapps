const { execSync } = require("child_process");
const fs = require("fs");
const { queryDb } = require("./misc");

async function generate_pdf(body) {
  const { company_id, post_id, newResume, newCoverletter, useSaved } = body;
  const isResume = type === "resume";
  const latexCode = isResume ? newResume : newCoverletter;
  const fileName = `./${type}/${company_id}_${post_id}.pdf`;

  if (useSaved && fs.existsSync(fileName)) return fileName;
  if (!latexCode) return false;

  await queryDb(`UPDATE posts SET ${type} = ? WHERE id = ?`, [latexCode, post_id]);
  fs.writeFileSync(`${type}/${company_id}_${post_id}.tex`, latexCode);
  execSync(`pdflatex -interaction=nonstopmode ./${type}/${company_id}_${post_id}.tex`, { stdio: "inherit" });
  ["aux", "log", "tex", "out"].forEach(ext => execSync(`rm ./${type}/${company_id}_${post_id}.${ext}`, { stdio: "inherit" }));
  execSync(`mv ./${type}/${company_id}_${post_id}.pdf ./${type}/`, { stdio: "inherit" });

  return fileName;
}

module.exports = { generate_pdf };
