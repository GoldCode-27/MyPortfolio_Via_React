import { useEffect, useRef, useState } from 'react'
import { apiRequest } from './api.js'
import eBidImage from './assets/E-bid.jpg'
import hrmImage from './assets/HRM.jpg'
import hostelImage from './assets/Hostel.jpg'
import k12Image from './assets/K-12.jpg'
import Chat from './components/Chat.jsx'
import ThemeToggle from './components/ThemeToggle.jsx'

const navItems = [
  { id: 'home', label: 'Home' },
  { id: 'about', label: 'About' },
  { id: 'services', label: 'Services' },
  { id: 'portfolio', label: 'Projects' },
  { id: 'pricing', label: 'Pricing' },
  { id: 'contact', label: 'Contact' },
]

const skills = [
  { title: 'React', value: 85 },
  { title: 'Node.js (Express)', value: 90 },
  { title: 'MySQL', value: 75 },
  { title: 'MongoDB', value: 70 },
  { title: 'Git', value: 80 },
  { title: 'GitHub Workflow', value: 85 },
]

const githubRepositoriesUrl = 'https://github.com/GoldCode-27?tab=repositories'

const portfolioItems = [
  {
    title: 'K-12 School Management Platform',
    description: 'A management platform built for K-12 school workflows.',
    image: k12Image,
    type: 'Education',
  },
  {
    title: 'Debre Tabor City Administration HRM System',
    description: 'A human resource management system for city administration.',
    image: hrmImage,
    type: 'Public administration',
  },
  {
    title: 'E-Bid System',
    description: 'An electronic bidding system for managing bid workflows.',
    image: eBidImage,
    type: 'Procurement',
  },
  {
    title: 'ማረፊያ (Hostel Management System)',
    description: 'A hostel management system for accommodation operations.',
    image: hostelImage,
    type: 'Hospitality',
  },
]

function App() {
  const [isSticky, setIsSticky] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [activeSectionId, setActiveSectionId] = useState('home')
  const [skillsAnimated, setSkillsAnimated] = useState(false)
  const [contactStatus, setContactStatus] = useState('')
  const [contactError, setContactError] = useState('')
  const [contactSending, setContactSending] = useState(false)
  const [activeProject, setActiveProject] = useState(null)

  const skillsWrapRef = useRef(null)
  const projectDialogCloseRef = useRef(null)
  const projectCardTriggerRef = useRef(null)

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

  useEffect(() => {
    if (!activeProject) return
    const trigger = projectCardTriggerRef.current
    const previousBodyOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    projectDialogCloseRef.current?.focus()

    const handleDialogKeys = (event) => {
      if (event.key === 'Escape') {
        setActiveProject(null)
        return
      }
      if (event.key !== 'Tab') return

      const controls = document.querySelectorAll(
        '.project-detail-dialog button:not(:disabled), .project-detail-dialog a[href]',
      )
      const first = controls[0]
      const last = controls[controls.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last?.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first?.focus()
      }
    }

    window.addEventListener('keydown', handleDialogKeys)
    return () => {
      window.removeEventListener('keydown', handleDialogKeys)
      document.body.style.overflow = previousBodyOverflow
      trigger?.focus()
    }
  }, [activeProject])

  const onNavClick = (id) => {
    setIsMenuOpen(false)
    const el = document.getElementById(id)
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const submitContactForm = async (event) => {
    event.preventDefault()
    setContactStatus('')
    setContactError('')
    setContactSending(true)
    const form = event.currentTarget
    const formData = new FormData(form)

    try {
      const result = await apiRequest('/contact', {
        method: 'POST',
        body: JSON.stringify({
          name: formData.get('name'),
          email: formData.get('email'),
          subject: formData.get('subject'),
          message: formData.get('message'),
          website: formData.get('website'),
        }),
      })
      if (result.submitted) {
        form.reset()
        setContactStatus(
          result.emailStatus === 'sent'
            ? 'Thanks for reaching out. Your message was saved and emailed successfully.'
            : result.emailStatus === 'failed'
              ? 'Your message is saved in my admin inbox, but the email notification could not be sent. I will still receive it here.'
              : 'Your message is saved in my admin inbox. Email notifications are not configured on the server yet.',
        )
      }
    } catch (error) {
      setContactError(
        error instanceof Error ? error.message : 'Could not send your message. Please try again.',
      )
    } finally {
      setContactSending(false)
    }
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
              <ThemeToggle />
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
                className="hero-greeting"
                style={{
                  fontFamily: "'Times New Roman', Times, serif",
                  fontSize: 40,
                }}
              >
                Hi,It&apos;s me
              </h2>
              <h2
                className="hero-name"
                style={{
                  paddingLeft: '0%',
                  paddingTop: 10,
                  fontSize: 50,
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
              <p style={{ paddingTop: 0, marginTop: 0 }}>
                I&apos;m a software developer who builds practical systems for schools, public
                administration, procurement, and hostel management. I develop and run my projects
                locally, with their source code available on GitHub.
              </p>

              <button type="button" id="start_button">
                <a
                  href="#about"
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
                          data-progress={`${s.value}%`}
                          style={{ width: skillsAnimated ? `${s.value}%` : '0%' }}
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
                <p className="service-description" style={{ fontWeight: 500, fontSize: 18 }}>
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
                <p className="service-description" style={{ fontWeight: 500, fontSize: 18 }}>
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
                <p className="service-description" style={{ fontWeight: 500, fontSize: 18 }}>
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
                <p className="service-description" style={{ fontWeight: 500, fontSize: 18 }}>
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
                <p className="service-description" style={{ fontWeight: 500, fontSize: 18 }}>
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
                <p className="service-description" style={{ fontWeight: 500, fontSize: 18 }}>
                  I craft visually engaging graphics,logos and UI elements that enhance user
                  experiance and give brands a professional identity.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="portfolio section-padding" id="portfolio">
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
                <article className="portfolio-item-inner project-card">
                  <button
                    className="project-card-expand"
                    type="button"
                    aria-label={`View details for ${item.title}`}
                    aria-haspopup="dialog"
                    onClick={(event) => {
                      projectCardTriggerRef.current = event.currentTarget
                      setActiveProject(item)
                    }}
                  />
                  <div className="project-visual">
                    <img
                      src={item.image}
                      alt={`${item.title} interface preview`}
                      loading="lazy"
                      decoding="async"
                    />
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
                </article>
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
      >
        <div className="container">
          <div className="row">
            <div className="section-title text-align">
              <h5 className="sub-title">contact</h5>
              <h3 className="main-title">get in touch</h3>
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
            <form onSubmit={submitContactForm} className="fs-form">
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
                      maxLength={100}
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
                      maxLength={254}
                      autoComplete="email"
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
                      maxLength={200}
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
                      maxLength={5000}
                    ></textarea>
                  </div>
                </div>

                <div className="contact-honeypot" aria-hidden="true">
                  <label htmlFor="fsWebsite">Leave this field empty</label>
                  <input id="fsWebsite" type="text" name="website" tabIndex={-1} autoComplete="off" />
                </div>

                {contactError && (
                  <p className="contact-form-feedback error" role="alert">{contactError}</p>
                )}
                {contactStatus && (
                  <p className="contact-form-feedback success" role="status">{contactStatus}</p>
                )}

                <button
                  type="submit"
                  className="fs-submit-btn"
                  id="submit_button"
                  disabled={contactSending}
                >
                  {contactSending ? 'Sending…' : 'Send Message'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>

      <footer>
        <p>
          &copy;All Right reserved:Workineh&apos;s portfolio.
        </p>
      </footer>

      {activeProject && (
        <div
          className="project-detail-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setActiveProject(null)
          }}
        >
          <section
            className="project-detail-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="project-detail-title"
            aria-describedby="project-detail-description"
          >
            <header className="project-detail-header">
              <div>
                <span className="project-type">{activeProject.type}</span>
                <h2 id="project-detail-title">{activeProject.title}</h2>
              </div>
              <button
                ref={projectDialogCloseRef}
                className="project-detail-close"
                type="button"
                aria-label="Close project details"
                onClick={() => setActiveProject(null)}
              >
                <i className="fas fa-times" aria-hidden="true"></i>
              </button>
            </header>
            <img
              className="project-detail-image"
              src={activeProject.image}
              alt={`${activeProject.title} full interface preview`}
            />
            <div className="project-detail-content">
              <p id="project-detail-description">{activeProject.description}</p>
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
          </section>
        </div>
      )}

      <Chat />
    </>
  )
}

export default App
