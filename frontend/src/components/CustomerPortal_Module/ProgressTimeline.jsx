import React from 'react';

function ProgressTimeline({ status, job }) {
    // Map job.status to timeline steps to match the image precisely
    const steps = [
        { label: 'Order Placed', statuses: ['pending', 'assigned', 'in-transit', 'completed'] },
        { label: 'Dispatching', statuses: ['assigned', 'in-transit', 'completed'] },
        { label: 'In Transit', statuses: ['in-transit', 'completed'] },
        { label: 'Arriving', statuses: [] }, // We might not have a distinct arriving state, we can map completed back/forth
        { label: 'Delivered', statuses: ['completed'] }
    ];

    if (status === 'cancelled') {
        return (
            <div className="horizontal-timeline cancelled-state">
                <span className="material-icons-outlined error-icon">cancel</span>
                <h3>Order Cancelled</h3>
            </div>
        );
    }

    // Determine current step index
    let currentStepIdx = 0;
    if (status === 'assigned') currentStepIdx = 1;
    if (status === 'in-transit') currentStepIdx = 2; // Arriving could be simulated by driver proximity later
    if (status === 'completed') currentStepIdx = 4;

    return (
        <div className="horizontal-timeline-container">
            <div className="horizontal-steps">
                {steps.map((step, index) => {
                    const isCompleted = index < currentStepIdx || (status === 'completed' && index === 4);
                    const isCurrent = index === currentStepIdx;
                    const isLast = index === steps.length - 1;

                    return (
                        <div key={index} className="step-wrapper">
                            <div className="step-content-box">
                                <div className={`h-step-circle ${isCompleted ? 'completed' : isCurrent ? 'current' : 'pending'}`}>
                                    {isCompleted ? (
                                        <span className="material-icons-outlined select-check">check</span>
                                    ) : (
                                        <span className="step-number">{index + 1}</span>
                                    )}
                                </div>
                                <span className={`step-label ${isCompleted || isCurrent ? 'active-text' : ''}`}>{step.label}</span>
                            </div>
                            {!isLast && (
                                <div className={`h-step-line ${isCompleted ? 'line-completed' : ''}`}></div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default ProgressTimeline;
