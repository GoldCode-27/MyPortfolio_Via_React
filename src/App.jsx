import { useEffect, useMemo, useRef, useState } from 'react'
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

const portfolioItems = [
  {
    title: 'web design',
    category: 'wordpress',
    imgSrc: '/images/portfolio/portfolio-1.jpg',
  },
  {
    title: 'wordpress',
    category: 'wordpress',
    imgSrc: '/images/portfolio/portfolio-2.jpg',
  },
  {
    title: 'photography',
    category: 'web-design',
    imgSrc: '/images/portfolio/portfolio-3.jpg',
  },
  {
    title: 'web-design',
    category: 'web-design',
    imgSrc: '/images/portfolio/portfolio-4.jpg',
  },
  {
    title: 'wordpress',
    category: 'wordpress',
    imgSrc: '/images/portfolio/portfolio-5.jpg',
  },
  {
    title: 'photography',
    category: 'photography',
    imgSrc: '/images/portfolio/photography.jpg',
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
  const [portfolioFilter, setPortfolioFilter] = useState('all')

  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)

  const skillsWrapRef = useRef(null)

  const filteredPortfolio = useMemo(() => {
    return portfolioItems.map((item) => {
      const shouldShow = portfolioFilter === 'all' || portfolioFilter === item.category
      return { ...item, shouldShow }
    })
  }, [portfolioFilter])

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
    const onKeyDown = (e) => {
      if (!lightboxOpen) return
      if (e.key === 'Escape') setLightboxOpen(false)
      if (e.key === 'ArrowRight') setLightboxIndex((i) => (i + 1) % portfolioItems.length)
      if (e.key === 'ArrowLeft')
        setLightboxIndex((i) => (i - 1 + portfolioItems.length) % portfolioItems.length)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [lightboxOpen])

  const openLightbox = (index) => {
    setLightboxIndex(index)
    setLightboxOpen(true)
  }

  const onNavClick = (id) => {
    setIsMenuOpen(false)
    const el = document.getElementById(id)
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const lightboxItem = portfolioItems[lightboxIndex]

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
                [workineh Chalachew]
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
                I specialized in <b>Web development</b>,<b>freelancing</b>,<b>graphics Design</b>,
                offering high-quality,tailored solutions that indivduals and business grow. with a
                strong focus on <b> excellence cretivity and reliability.</b>
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
                <a href="https://www.facebook.com/workinew.chale" target="_blank" rel="noreferrer">
                  <i className="fab fa-facebook-f" style={{ color: 'blue' }}></i>
                </a>
                <a href="https://www.youtube.com/@work-u2v" target="_blank" rel="noreferrer">
                  <i className="fab fa-youtube" style={{ color: 'rgb(185, 22, 22)' }}></i>
                </a>
                <a href="#">
                  <i className="fab fa-twitter" style={{ color: 'rgb(88, 138, 139)' }}></i>
                </a>
                <a href="#">
                  <i className="fab fa-instagram" style={{ color: 'orangered' }}></i>
                </a>
                <a href="#">
                  <i className="fab fa-linkedin"></i>
                </a>
                <a href="#">
                  <i className="fab fa-telegram" style={{ color: 'rgb(78, 82, 77)' }}></i>
                </a>
                <a
                  href="https://vm.tiktok.com/ZMHg3XW6CVGQh-aLsp9/"
                  target="_blank"
                  rel="noreferrer"
                >
                  <i className="fab fa-tiktok" style={{ color: 'rgb(10, 8, 4)' }}></i>
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
                I&apos;m a tech-focused freelancer and romote developer with a strong passion for
                coding,innovation and digital problem solving. I build modern responsive websites
                and application using HTML,CSS,javaScript and with the collaboration of backend
                development in efficient and user iteractive interface and also other current
                technologies.
                <br />
                <br />
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
              <h3 className="main-title">These are my latest projects</h3>
              <ul className="lines">
                <li></li>
                <li></li>
                <li></li>
              </ul>
            </div>
          </div>

          <div className="row">
            <div className="portfolio-filter">
              {[
                { id: 'all', label: 'All' },
                { id: 'web-design', label: 'web design' },
                { id: 'photography', label: 'photography' },
                { id: 'wordpress', label: 'wordpress' },
              ].map((f) => (
                <button
                  type="button"
                  key={f.id}
                  className={portfolioFilter === f.id ? 'active' : undefined}
                  data-filter={f.id}
                  onClick={() => setPortfolioFilter(f.id)}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="row">
            {filteredPortfolio.map((item, idx) => (
              <div
                key={`${item.imgSrc}-${idx}`}
                className={`portfolio-item ${item.shouldShow ? 'show' : 'hide'}`}
                data-category={item.category}
                onClick={() => openLightbox(idx)}
              >
                <div className="portfolio-item-inner">
                  <div className="portfolio-img">
                    <img src={item.imgSrc} alt={item.title} />
                  </div>
                  <div className="portfolio-info">
                    <h4>{item.title}</h4>
                    <div className="icon">
                      <i className="fa fa-search"></i>
                    </div>
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

      <div
        className={`lightbox${lightboxOpen ? ' open' : ''}`}
        onClick={(e) => {
          if (e.target.classList.contains('lightbox') || e.target.classList.contains('lightbox-close')) {
            setLightboxOpen(false)
          }
        }}
        role="dialog"
        aria-modal="true"
        aria-hidden={!lightboxOpen}
      >
        <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
          <button type="button" className="lightbox-close" aria-label="Close lightbox">
            &times;
          </button>

          <div className="lightbox-img-wrap">
            <img className="lightbox-img" src={lightboxItem?.imgSrc} alt={lightboxItem?.title ?? ''} />
          </div>

          <div className="lightbox-caption">
            <div className="caption-text">{lightboxItem?.title}</div>
            <div className="caption-counter">
              {lightboxIndex + 1} of {portfolioItems.length}
            </div>
          </div>

          <button
            type="button"
            className="lightbox-prev"
            aria-label="Previous item"
            onClick={() => setLightboxIndex((i) => (i - 1 + portfolioItems.length) % portfolioItems.length)}
          >
            &#10094;
          </button>
          <button
            type="button"
            className="lightbox-next"
            aria-label="Next item"
            onClick={() => setLightboxIndex((i) => (i + 1) % portfolioItems.length)}
          >
            &#10095;
          </button>
        </div>
      </div>

      <Chat />
    </>
  )
}

export default App
