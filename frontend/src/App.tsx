import { useEffect, useState } from "react";
import { education, experience, profile, projects, skills } from "./resumeData";
import { getUser, type User } from "./auth";
import ContactForm from "./components/ContactForm";
import Testimonials from "./components/Testimonials";
import portrait from "./assets/portrait.jpg";

export default function App() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    getUser().then(setUser);
  }, []);

  return (
    <div className="page">
      <aside className="identity">
        <div className="nameplate">
          <img className="portrait" src={portrait} alt="" />
          <h1>{profile.name}</h1>
        </div>
        <p className="title">{profile.title}</p>
        <p className="place">{profile.location}</p>
        <ul className="links">
          {profile.links.map((l) => (
            <li key={l.href}>
              <a href={l.href}>{l.label}</a>
            </li>
          ))}
        </ul>
        <nav aria-label="Sections">
          <a href="#experience">Experience</a>
          <a href="#skills">Skills</a>
          <a href="#projects">Projects</a>
          <a href="#education">Education</a>
          <a href="#recommendations">Recommendations</a>
          <a href="#contact">Contact</a>
        </nav>
      </aside>

      <main>
        <section aria-label="Summary">
          <p className="summary">{profile.summary}</p>
        </section>

        <section id="experience">
          <h2>Experience</h2>
          <ol className="timeline">
            {experience.map((job) => (
              <li key={`${job.company}-${job.start}`}>
                <div className="job-head">
                  <h3>{job.role}</h3>
                  <span className="dates">
                    {job.start} – {job.end}
                  </span>
                </div>
                <p className="company">{job.company}</p>
                <ul>
                  {job.bullets.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </section>

        <section id="skills">
          <h2>Skills</h2>
          <dl className="skills">
            {skills.map((s) => (
              <div key={s.group}>
                <dt>{s.group}</dt>
                <dd>{s.items.join(", ")}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section id="projects">
          <h2>Projects</h2>
          {projects.map((p) => (
            <article key={p.name} className="project">
              <h3>{p.href ? <a href={p.href}>{p.name}</a> : p.name}</h3>
              <p>{p.description}</p>
            </article>
          ))}
        </section>

        <section id="education">
          <h2>Education</h2>
          {education.map((e) => (
            <p key={e.school} className="edu">
              <strong>{e.credential}</strong>, {e.school} ({e.year})
            </p>
          ))}
        </section>

        <Testimonials user={user} onUserChange={setUser} />

        <ContactForm />
      </main>
    </div>
  );
}
