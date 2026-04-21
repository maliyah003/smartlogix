import { BlinkBlur } from 'react-loading-indicators';

/**
 * Full-area loading state — same BlinkBlur treatment as Trip Tracking (/trips).
 */
export default function PageLoading({ className = '', style }) {
    return (
        <div
            className={['loading-container', 'fade-in', className].filter(Boolean).join(' ')}
            style={style}
        >
            <BlinkBlur color="#f59e0b" size="medium" text="" textColor="" />
        </div>
    );
}
