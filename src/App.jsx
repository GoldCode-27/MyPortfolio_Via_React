import { useEffect, useRef, useState } from 'react'
import Chat from './components/Chat.jsx'

const navItems = [
  { id: 'home', label: 'Home' },
  { id: 'about', label: 'About' },
  { id: 'services', label: 'Services' },
  { id: 'portfolio', label: 'Projects' },
  { id: 'pricing', label: 'Pricing' },
  { id: 'contact', label: 'Contact' },
]

const skills = [
  { title: 'UI/UX Design', value: 90, progress: '90%' },
  { title: 'Web Design', value: 95, progress: '95%' },
  { title: 'HTML/CSS', value: 90, progress: '80%' },
  { title: 'Android', value: 70, progress: '70%' },
]

const githubRepositoriesUrl = 'https://github.com/GoldCode-27?tab=repositories'

const portfolioItems = [
  {
    title: 'K-12 School Management Platform',
    description: 'A management platform built for K-12 school workflows.',
    icon: 'fas fa-school',
    type: 'Education',
  },
  {
    title: 'Debre Tabor City Administration HRM System',
    description: 'A human resource management system for city administration.',
    icon: 'fas fa-landmark',
    type: 'Public administration',
  },
  {
    title: 'E-Bid System',
    description: 'An electronic bidding system for managing bid workflows.',
    icon: 'fas fa-file-invoice-dollar',
    type: 'Procurement',
  },
  {
    title: 'ማረፊያ (Hostel Management System)',
    description: 'A hostel management system for accommodation operations.',
    icon: 'fas fa-bed',
    type: 'Hospitality',
  },
]

function App() {
  const [theme, setTheme] = useState(
    () => localStorage.getItem('portfolio_theme') || 'light',
  )
  const [isSticky, setIsSticky] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [activeSectionId, setActiveSectionId] = useState('home')
  const [skillsAnimated, setSkillsAnimated] = useState(false)

  const skillsWrapRef = useRef(null)

  useEffect(() => {
    const onScroll = () => {
      setIsSticky(window.scrollY > 20)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const sectionEls = Array.from(document.querySelectorAll('section[id]'))
    if (sectionEls.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => (b.intersectionRatio ?? 0) - (a.intersectionRatio ?? 0))[0]

        if (visible?.target?.id) setActiveSectionId(visible.target.id)
      },
      { root: null, rootMargin: '-40% 0px -55% 0px', threshold: [0.01, 0.1, 0.25] },
    )

    sectionEls.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const el = skillsWrapRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setSkillsAnimated(true)
          observer.disconnect()
        }
      },
      { threshold: 0.2 },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const onNavClick = (id) => {
    setIsMenuOpen(false)
    const el = document.getElementById(id)
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  useEffect(() => {
    const root = document.documentElement
    root.classList.remove('theme-light', 'theme-dark')
    root.classList.add(`theme-${theme}`)
    localStorage.setItem('portfolio_theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }

  return (
    <>
      <nav className={`navbar${isSticky ? ' sticky' : ''}`}>
        <div className="container">
          <div className="row justify-content-between">
            <div className="logo">
              <a
                href="#home"
                onClick={(e) => {
                  e.preventDefault()
                  onNavClick('home')
                }}
              >
                developer & <span>Freelancer</span>
              </a>
            </div>

            <div className="links">
              <ul className={`menu${isMenuOpen ? ' active' : ''}`}>
                {navItems.map((item) => (
                  <li className="nav-item" key={item.id}>
                    <a
                      href={`#${item.id}`}
                      className={`nav-link${activeSectionId === item.id ? ' active' : ''}`}
                      onClick={(e) => {
                        e.preventDefault()
                        onNavClick(item.id)
                      }}
                    >
                      {item.label} <span></span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className="theme-toggle-btn"
                onClick={toggleTheme}
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? '☀︎' : '☾'}
              </button>
              <button
                type="button"
                className="menu-btn"
                aria-label="Toggle menu"
                aria-expanded={isMenuOpen}
                onClick={() => setIsMenuOpen((v) => !v)}
              >
                <i className="fas fa-bars"></i>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <section className="home-section" id="home">
        <div className="container">
          <div className="row align-items-center">
            <div className="home-text">
              <h2
                style={{
                  fontFamily: "'Times New Roman', Times, serif",
                  color: 'rgb(9, 94, 94)',
                  fontSize: 40,
                }}
              >
                Hi,It&apos;s me
              </h2>
              <h2
                style={{
                  paddingLeft: '0%',
                  paddingTop: 10,
                  fontSize: 50,
                  color: 'rgb(85, 6, 36)',
                  fontWeight: 800,
                  paddingBottom: 0,
                }}
              >
                Workineh Chalachew
              </h2>
              <h1
                className="text_animation"
                style={{
                  fontSize: 50,
                  letterSpacing: 0,
                  fontFamily: "'Times New Roman', Times, serif",
                }}
              >
                I&apos;m a <span style={{ fontSize: 100 }}></span>
              </h1>
              <p style={{ paddingTop: 0, marginTop: 0, color: 'rgb(43, 19, 2)' }}>
                I&apos;m a software developer who builds practical systems for schools, public
                administration, procurement, and hostel management. I develop and run my projects
                locally, with their source code available on GitHub.
              </p>

              <button type="button" id="start_button">
                <a
                  href="#about"
                  style={{ color: 'rgb(221, 226, 231)' }}
                  onClick={(e) => {
                    e.preventDefault()
                    onNavClick('about')
                  }}
                >
                  Start Now
                </a>
              </button>

              <div className="header-social" id="header_socia">
                <a
                  className="social-facebook"
                  href="https://www.facebook.com/workinew.chale"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Facebook"
                >
                  <i className="fab fa-facebook-f" aria-hidden="true"></i>
                </a>
                <a
                  className="social-youtube"
                  href="https://www.youtube.com/@work-u2v"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="YouTube"
                >
                  <i className="fab fa-youtube" aria-hidden="true"></i>
                </a>
                <a
                  className="social-github"
                  href={githubRepositoriesUrl}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="GitHub repositories"
                >
                  <i className="fab fa-github" aria-hidden="true"></i>
                </a>
                <a className="social-twitter" href="#" aria-label="Twitter">
                  <i className="fab fa-twitter" aria-hidden="true"></i>
                </a>
                <a className="social-instagram" href="#" aria-label="Instagram">
                  <i className="fab fa-instagram" aria-hidden="true"></i>
                </a>
                <a className="social-linkedin" href="#" aria-label="LinkedIn">
                  <i className="fab fa-linkedin" aria-hidden="true"></i>
                </a>
                <a className="social-telegram" href="#" aria-label="Telegram">
                  <i className="fab fa-telegram" aria-hidden="true"></i>
                </a>
                <a
                  className="social-tiktok"
                  href="https://vm.tiktok.com/ZMHg3XW6CVGQh-aLsp9/"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="TikTok"
                >
                  <i className="fab fa-tiktok" aria-hidden="true"></i>
                </a>
              </div>
            </div>

            <div className="home-image">
              <div className="img-box" id="developer_image">
                <img
                  id="my_image"
                  src="/images/wwww.png"
                  alt="Developer"
                  style={{ paddingLeft: 7, paddingRight: 5, height: 550 }}
                />
              </div>
            </div>
          </div>
        </div>
        <div className="header-hero-shape"></div>
      </section>

      <section className="about-section section-padding" id="about">
        <div className="container">
          <div className="row align-items-center justify-content-center">
            <div className="about-image">
              <div className="img-box">
                <img
                  id="profession_photo"
                  src="/images/3.png"
                  alt="Profile"
                  style={{
                    width: 389,
                    height: 550,
                    paddingLeft: 0,
                    paddingBottom: 13,
                    paddingRight: 15,
                    marginLeft: 15,
                  }}
                />
                <div className="about-shape"></div>
              </div>
            </div>

            <div className="about-content">
              <div className="section-title">
                <h5 className="sub-titlee">About</h5>
                <h3 className="main-title" style={{ textAlign: 'center' }}>
                  Why You Hire Me?
                </h3>
                <ul className="linee">
                  <li></li>
                  <li></li>
                  <li></li>
                </ul>
              </div>

              <p>
                I&apos;m Workineh Chalachew, a software developer focused on building useful
                management systems. My projects include a K-12 school platform, a city
                administration HRM system, an electronic bidding system, and a hostel management
                system. They run locally on my computer, and I share their source code on GitHub.
              </p>

              <div className="about-skills" ref={skillsWrapRef}>
                {skills.map((s) => (
                  <div className="skill-item" key={s.title}>
                    <div className="skill-header">
                      <h6 className="skill-title">{s.title}</h6>
                      <div className="skill-percentage">
                        <p>
                          <span className="counter">{s.value}</span>%
                        </p>
                      </div>
                    </div>
                    <div className="skill-bar">
                      <div className="bar-inner">
                        <div
                          className="bar progress-line"
                          data-progress={s.progress}
                          style={{ width: skillsAnimated ? s.progress : '0%' }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        className="service-section section-padding"
        id="services"
        style={{ backgroundColor: 'rgb(121, 58, 35)', margin: 17, borderRadius: 10 }}
      >
        <div className="container">
          <div className="row">
            <div className="section-title text-align">
              <h5 className="sub-title">services</h5>
              <h3 className="main-title">Services I Provide</h3>
              <ul className="line">
                <li></li>
                <li></li>
                <li></li>
              </ul>
            </div>
          </div>

          <div className="row">
            <div className="service-item">
              <div className="service-item-inner">
                <div className="icon">
                  <i className="fas fa-laptop-code"></i>
                </div>
                <h3>Web development</h3>
                <p style={{ color: 'rgb(46, 17, 2)', fontWeight: 500, fontSize: 18 }}>
                  I develop fast.functional,and interactive websites using clean,well-structured
                  code withtechnologies like javaScript and frontend library.
                </p>
              </div>
            </div>

            <div className="service-item">
              <div className="service-item-inner">
                <div className="icon">
                  <i className="fab fa-android"></i>
                </div>
                <h3>Android development</h3>
                <p style={{ color: 'rgb(46, 17, 2)', fontWeight: 500, fontSize: 18 }}>
                  I built intuitive and user friendly android applications with smooth functionality
                  and appealing design using java or kotlin.
                </p>
              </div>
            </div>

            <div className="service-item">
              <div className="service-item-inner">
                <div className="icon">
                  <i className="fas fa-code"></i>
                </div>
                <h3>Clean Code</h3>
                <p style={{ color: 'rgb(46, 17, 2)', fontWeight: 500, fontSize: 18 }}>
                  I write organazed,maintanable and scalable code that follows best practices-making
                  future updates easier and more efficient.
                </p>
              </div>
            </div>

            <div className="service-item">
              <div className="service-item-inner">
                <div className="icon">
                  <i className="fas fa-laptop-house"></i>
                </div>
                <h3>Remote Working</h3>
                <p style={{ color: 'rgb(46, 17, 2)', fontWeight: 500, fontSize: 18 }}>
                  I create website that look and work perfectly across all devices-mobiles,tablet
                  and desktop by using modern HTML,CSS and responsive frameworks.
                </p>
              </div>
            </div>

            <div className="service-item">
              <div className="service-item-inner">
                <div className="icon">
                  <i className="fas fa-video"></i>
                </div>
                <h3>Video Editing</h3>
                <p style={{ color: 'rgb(46, 17, 2)', fontWeight: 500, fontSize: 18 }}>
                  I edit and produce high quality videos for web,social media,and promotional
                  content using tools like Adobr premium,capcut,AIand also trough compatable
                  softwares.
                </p>
              </div>
            </div>

            <div className="service-item">
              <div className="service-item-inner">
                <div className="icon">
                  <i className="fas fa-palette"></i>
                </div>
                <h3>Graphic design</h3>
                <p style={{ color: 'rgb(46, 17, 2)', fontWeight: 500, fontSize: 18 }}>
                  I craft visually engaging graphics,logos and UI elements that enhance user
                  experiance and give brands a professional identity.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="portfolio section-padding" id="portfolio" style={{ backgroundColor: 'rgb(12, 53, 53)' }}>
        <div className="container">
          <div className="row">
            <div className="section-title text-align">
              <h5 className="sub-title">Projects</h5>
              <h3 className="main-title">Systems I&apos;ve built</h3>
              <p className="project-intro">
                These projects run locally on my computer. Their source code is available in my
                GitHub repositories.
              </p>
              <ul className="lines">
                <li></li>
                <li></li>
                <li></li>
              </ul>
            </div>
          </div>

          <div className="row">
            {portfolioItems.map((item) => (
              <div key={item.title} className="portfolio-item">
                <div className="portfolio-item-inner project-card">
                  <div className="project-visual" aria-hidden="true">
                    <i className={item.icon}></i>
                  </div>
                  <div className="project-card-content">
                    <span className="project-type">{item.type}</span>
                    <h4>{item.title}</h4>
                    <p>{item.description}</p>
                    <span className="project-status">
                      <i className="fas fa-desktop" aria-hidden="true"></i> Runs locally
                    </span>
                    <a
                      className="project-source-link"
                      href={githubRepositoriesUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <i className="fab fa-github" aria-hidden="true"></i> Browse source on GitHub
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="pricing section-padding" id="pricing">
        <div className="container">
          <div className="row">
            <div className="section-title text-align">
              <h5 className="sub-title">pricing</h5>
              <h3 className="main-title">pricing plans</h3>
              <ul className="line">
                <li></li>
                <li></li>
                <li></li>
              </ul>
            </div>
          </div>

          <div className="row justify-content-center">
            <div className="pricing-item">
              <div className="pricing-plan">
                <div className="pricing-header">
                  <h3>basic</h3>
                </div>
                <div className="pricing-price">
                  <span className="currency">$</span>
                  <span className="price">59</span>
                  <span className="period">/monthly</span>
                </div>
                <div className="pricing-body">
                  <ul>
                    <li>
                      <i className="fa fa-check"></i> 5 GB BandWidth
                    </li>
                    <li>
                      <i className="fa fa-check"></i> Free Update
                    </li>
                    <li>
                      <i className="fa fa-check"></i> High Regulation Printing
                    </li>
                    <li>
                      <i className="fa fa-check"></i> Branding
                    </li>
                    <li>
                      <i className="fa fa-check"></i> Another Great Features
                    </li>
                  </ul>
                </div>
                <div className="pricing-footer">
                  <a
                    href="#contact"
                    className="btn-2"
                    onClick={(e) => {
                      e.preventDefault()
                      onNavClick('contact')
                    }}
                  >
                    get started
                  </a>
                </div>
              </div>
            </div>

            <div className="pricing-item">
              <div className="pricing-plan">
                <div className="pricing-header">
                  <h3>premium</h3>
                  <h2 className="best-value">best value</h2>
                </div>
                <div className="pricing-price">
                  <span className="currency">$</span>
                  <span className="price">99</span>
                  <span className="period">/monthly</span>
                </div>
                <div className="pricing-body">
                  <ul>
                    <li>
                      <i className="fa fa-check"></i> 5 GB BandWidth
                    </li>
                    <li>
                      <i className="fa fa-check"></i> Free Update
                    </li>
                    <li>
                      <i className="fa fa-check"></i> High Regulation Printing
                    </li>
                    <li>
                      <i className="fa fa-check"></i> Branding
                    </li>
                    <li>
                      <i className="fa fa-check"></i> Another Great Features
                    </li>
                  </ul>
                </div>
                <div className="pricing-footer">
                  <a
                    href="#contact"
                    className="btn-1"
                    onClick={(e) => {
                      e.preventDefault()
                      onNavClick('contact')
                    }}
                  >
                    get started
                  </a>
                </div>
              </div>
            </div>

            <div className="pricing-item">
              <div className="pricing-plan">
                <div className="pricing-header">
                  <h3>ultimate</h3>
                </div>
                <div className="pricing-price">
                  <span className="currency">$</span>
                  <span className="price">199</span>
                  <span className="period">/monthly</span>
                </div>
                <div className="pricing-body">
                  <ul>
                    <li>
                      <i className="fa fa-check"></i> 5 GB BandWidth
                    </li>
                    <li>
                      <i className="fa fa-check"></i> Free Update
                    </li>
                    <li>
                      <i className="fa fa-check"></i> High Regulation Printing
                    </li>
                    <li>
                      <i className="fa fa-check"></i> Branding
                    </li>
                    <li>
                      <i className="fa fa-check"></i> Another Great Features
                    </li>
                  </ul>
                </div>
                <div className="pricing-footer">
                  <a
                    href="#contact"
                    className="btn-2"
                    onClick={(e) => {
                      e.preventDefault()
                      onNavClick('contact')
                    }}
                  >
                    get started
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        className="contact-section section-padding"
        id="contact"
        style={{ height: 'auto', margin: 20, borderRadius: 5, backgroundColor: 'rgb(6, 1, 19)' }}
      >
        <div className="container">
          <div className="row">
            <div className="section-title text-align">
              <h5 className="sub-title">contact</h5>
              <h3 className="main-title" style={{ color: 'white' }}>
                get in touch
              </h3>
              <ul className="line">
                <li></li>
                <li></li>
                <li></li>
              </ul>
            </div>
          </div>

          <div className="row">
            <div className="contact-item">
              <div className="contact-item-inner">
                <i className="fas fa-phone"></i>
                <span>Phone</span>
                <p>+251945799988</p>
                <p>+251905515332</p>
              </div>
            </div>

            <div className="contact-item">
              <div className="contact-item-inner">
                <i className="fas fa-envelope"></i>
                <span>Email</span>
                <p>1.workineh732@gmail.com</p>
                <p>2.workinehwor@gmmail.com</p>
              </div>
            </div>

            <div className="contact-item">
              <div className="contact-item-inner">
                <i className="fas fa-map-marker-alt"></i>
                <span>Address</span>
                <p>DEBRETABOR-ETHIOPIA</p>
              </div>
            </div>
          </div>

          <div className="fs-wrapper">
            <form action="https://formspree.io/f/xjkogykq" method="POST" className="fs-form">
              <div className="section-title">
                <h1 id="contact_header">contact me</h1>
              </div>

              <div className="fs-grid">
                <div className="fs-left">
                  <div className="fs-group">
                    <label htmlFor="fsName" className="fs-label">
                      Your Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      id="fsName"
                      className="fs-input"
                      required
                      placeholder="Name"
                    />
                  </div>

                  <div className="fs-group">
                    <label htmlFor="fsEmail" className="fs-label">
                      Your Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      id="fsEmail"
                      className="fs-input"
                      required
                      placeholder="E.g, abc123@gmail.com"
                    />
                  </div>

                  <div className="fs-group">
                    <label htmlFor="fsSubject" className="fs-label">
                      Subject
                    </label>
                    <input
                      type="text"
                      name="subject"
                      id="fsSubject"
                      className="fs-input"
                      required
                      placeholder="From what..."
                    />
                  </div>
                </div>

                <div className="fs-right">
                  <div className="fs-group">
                    <label htmlFor="fsMessage" className="fs-label">
                      Message
                    </label>
                    <textarea
                      name="message"
                      placeholder="Type here..."
                      id="fsMessage"
                      className="fs-input"
                      rows="12"
                      required
                      maxLength={500}
                    ></textarea>
                  </div>
                </div>

                <button type="submit" className="fs-submit-btn" id="submit_button">
                  Send Message
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>

      <footer>
        <p style={{ textAlign: 'center', backgroundColor: 'rgb(31, 136, 101)' }}>
          &copy;All Right reserved:Workineh&apos;s portfolio.
        </p>
      </footer>

      <Chat />
    </>
  )
}

export default App
