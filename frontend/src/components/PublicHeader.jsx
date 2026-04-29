import { Link, NavLink } from 'react-router-dom';
import logoImg from '../assets/SmartLogixLogo.png';
import './PublicHeader.css';

function ChevronDown() {
    return (
        <span className="material-icons-outlined public-header__chevron" aria-hidden>
            expand_more
        </span>
    );
}

export default function PublicHeader() {
    return (
        <header className="public-header">
            <div className="public-header__container">
                <div className="public-header__left">
                    <Link to="/track" className="public-header-brand">
                        <img src={logoImg} alt="SmartLogix" className="public-header-logo" />
                    </Link>

                    <nav className="public-header__nav" aria-label="Primary">
                        <NavLink to="/track" className="public-header__link" end>
                            Track
                        </NavLink>

                        <div className="public-header__dropdown">
                            <button type="button" className="public-header__nav-trigger">
                                Ship
                                <ChevronDown />
                            </button>
                            <div className="public-header__dropdown-panel" role="menu">
                                <a href="#domestic" className="public-header__dropdown-item" role="menuitem">
                                    Domestic shipping
                                </a>
                                <a href="#international" className="public-header__dropdown-item" role="menuitem">
                                    International
                                </a>
                                <a href="#express" className="public-header__dropdown-item" role="menuitem">
                                    Express options
                                </a>
                            </div>
                        </div>

                        <div className="public-header__dropdown">
                            <button type="button" className="public-header__nav-trigger">
                                Enterprise Logistics Services
                                <ChevronDown />
                            </button>
                            <div className="public-header__dropdown-panel" role="menu">
                                <a href="#fleet" className="public-header__dropdown-item" role="menuitem">
                                    Fleet &amp; transport
                                </a>
                                <a href="#warehouse" className="public-header__dropdown-item" role="menuitem">
                                    Warehouse &amp; fulfilment
                                </a>
                                <a href="#consulting" className="public-header__dropdown-item" role="menuitem">
                                    Supply chain consulting
                                </a>
                            </div>
                        </div>

                        <a href="#support" className="public-header__link public-header__link--plain">
                            Customer Service
                        </a>
                    </nav>
                </div>

                <div className="public-header-actions">
                    <Link to="/login" className="public-header-signin">
                        Sign in
                    </Link>
                </div>
            </div>
        </header>
    );
}
