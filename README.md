//todo: Conditionally BindDB => c.env.DB.prepare
//todo: Rewrite DB.prepare("Select * from ?").bind(value).all()
//todo: stripe - email
//todo: stripe env vars. 
//todo: authentication

# resumAI

Scan job posts and links, then generate a refined resume and cover letter.

## About

With the app, you can:

- Auto-generate email, resume, and cover letters
- Auto-send emails with resume and cover letter
- Individually or bulk process job posts found online.
- Auto-fill online job forms and auto-upload neccessary documents.
- Create chatbots on a per company/job basis.
- Grab or create a company's sitemap then use this information to:
- - Extract relevant job/company information from links and embedded videos.
- - Use an LLM-powered web crawler to navigate the web and scan for new jobs.

## Pictures

![Chrome Extension](./img/6.jpg "Chrome Extension")

![Settings Overview](./img/1.jpg "Settings Overview")

![Settings Overview](./img/2.jpg "Settings Overview")

![Settings Overview](./img/3.jpg "Settings Overview")

![Settings Overview](./img/4.jpg "Settings Overview")

![Settings Overview](./img/5.jpg "Settings Overview")

`apt-get install texlive`
`sudo apt-get install texlive-latex-extra` - `Y`



#documentscontainer

- #uploadeddocuments
- - You have no cover letters or resumes
- - button #newdocument

- #documenteditor
- - form
- - - select name="type" [ value="resume", value="coverletter"]
- - - name="title"
- - - name="file" accept=".pdf,.txt,.md,.doc,.docx"
- - - name="text"  
