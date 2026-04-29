import { Link } from 'react-router-dom';
import logoImg from '../assets/smartlogixlogo.png';
import './PublicFooter.css';

function ExternalLink({ href, children }) {
    return (
        <a href={href} target="_blank" rel="noopener noreferrer" className="public-footer__link public-footer__link--external">
            <span>{children}</span>
            <span className="material-icons-outlined public-footer__ext-icon" aria-hidden>
                open_in_new
            </span>
        </a>
    );
}

function FooterLink({ to, children }) {
    return (
        <Link to={to} className="public-footer__link">
            {children}
        </Link>
    );
}

export default function PublicFooter() {
    const year = new Date().getFullYear();

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <footer className="public-footer">
            <div className="public-footer__top">
                <div className="public-footer__grid">
                    <div className="public-footer__col">
                        <h3 className="public-footer__heading public-footer__heading--accent">Quick links</h3>
                        <ul className="public-footer__list">
                            <li>
                                <FooterLink to="/track">Order tracking</FooterLink>
                            </li>
                            <li>
                                <FooterLink to="/login">Team sign in</FooterLink>
                            </li>
                            <li>
                                <a href="mailto:support@smartlogix.example" className="public-footer__link">
                                    Customer support
                                </a>
                            </li>
                            <li>
                                <a href="#quote" className="public-footer__link">
                                    Request a quote
                                </a>
                            </li>
                            <li>
                                <a href="#business" className="public-footer__link">
                                    Business solutions
                                </a>
                            </li>
                        </ul>
                    </div>

                    <div className="public-footer__col">
                        <h3 className="public-footer__heading">Our platform</h3>
                        <ul className="public-footer__list">
                            <li>
                                <a href="#fleet" className="public-footer__link">
                                    Fleet visibility
                                </a>
                            </li>
                            <li>
                                <a href="#routing" className="public-footer__link">
                                    Route optimization
                                </a>
                            </li>
                            <li>
                                <a href="#economics" className="public-footer__link">
                                    Trip economics
                                </a>
                            </li>
                            <li>
                                <a href="#maintenance" className="public-footer__link">
                                    Predictive maintenance
                                </a>
                            </li>
                        </ul>
                    </div>

                    <div className="public-footer__col">
                        <h3 className="public-footer__heading">Industry focus</h3>
                        <ul className="public-footer__list">
                            <li>
                                <a href="#retail" className="public-footer__link">
                                    Retail &amp; e‑commerce
                                </a>
                            </li>
                            <li>
                                <a href="#manufacturing" className="public-footer__link">
                                    Manufacturing
                                </a>
                            </li>
                            <li>
                                <a href="#healthcare" className="public-footer__link">
                                    Life sciences
                                </a>
                            </li>
                            <li>
                                <a href="#tech" className="public-footer__link">
                                    Technology
                                </a>
                            </li>
                            <li>
                                <a href="#energy" className="public-footer__link">
                                    Energy &amp; utilities
                                </a>
                            </li>
                        </ul>
                    </div>

                    <div className="public-footer__col">
                        <h3 className="public-footer__heading">Company</h3>
                        <ul className="public-footer__list">
                            <li>
                                <a href="#about" className="public-footer__link">
                                    About SmartLogix
                                </a>
                            </li>
                            <li>
                                <ExternalLink href="https://example.com">News &amp; stories</ExternalLink>
                            </li>
                            <li>
                                <ExternalLink href="https://example.com">Careers</ExternalLink>
                            </li>
                            <li>
                                <a href="#press" className="public-footer__link">
                                    Press
                                </a>
                            </li>
                            <li>
                                <a href="#sustainability" className="public-footer__link">
                                    Sustainability
                                </a>
                            </li>
                            <li>
                                <a href="#innovation" className="public-footer__link">
                                    Innovation
                                </a>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>

            <div className="public-footer__bottom">
                <div className="public-footer__bottom-inner">
                    <div className="public-footer__brand-block">
                        <img src={logoImg} alt="SmartLogix" className="public-footer__logo" />
                        <nav className="public-footer__legal" aria-label="Legal">
                            <a href="#fraud" className="public-footer__legal-link">
                                Fraud awareness
                            </a>
                            <span className="public-footer__legal-sep" aria-hidden>
                                |
                            </span>
                            <a href="#legal" className="public-footer__legal-link">
                                Legal notice
                            </a>
                            <span className="public-footer__legal-sep" aria-hidden>
                                |
                            </span>
                            <a href="#terms" className="public-footer__legal-link">
                                Terms of use
                            </a>
                            <span className="public-footer__legal-sep" aria-hidden>
                                |
                            </span>
                            <a href="#privacy" className="public-footer__legal-link">
                                Privacy
                            </a>
                            <span className="public-footer__legal-sep" aria-hidden>
                                |
                            </span>
                            <a href="#cookies" className="public-footer__legal-link">
                                Cookie settings
                            </a>
                        </nav>
                        <p className="public-footer__copy">
                            {year} © SmartLogix — all rights reserved
                        </p>
                    </div>

                    <div className="public-footer__social">
                        <p className="public-footer__follow">Follow us</p>
                        <div className="public-footer__icons">
                            <a
                                href="https://www.youtube.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="public-footer__social-btn public-footer__social-btn--yt"
                                aria-label="YouTube"
                            >
                                YT
                            </a>
                            <a
                                href="https://www.facebook.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="public-footer__social-btn public-footer__social-btn--fb"
                                aria-label="Facebook"
                            >
                                f
                            </a>
                            <a
                                href="https://www.linkedin.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="public-footer__social-btn public-footer__social-btn--in"
                                aria-label="LinkedIn"
                            >
                                in
                            </a>
                            <a
                                href="https://www.instagram.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="public-footer__social-btn public-footer__social-btn--ig"
                                aria-label="Instagram"
                            >
                                IG
                            </a>
                        </div>
                    </div>
                </div>

                <button
                    type="button"
                    className="public-footer__back-top"
                    onClick={scrollToTop}
                    aria-label="Back to top"
                >
                    <span className="material-icons-outlined">expand_less</span>
                </button>
            </div>
        </footer>
    );
}
