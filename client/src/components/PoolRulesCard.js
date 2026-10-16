import React from "react";

export default function PoolRulesCard({
    title,
    rulesHtml,
    children,
    accentColor = "#D50A0A",
    subtitle = "Rules & Overview",
    className = ""
}) {
    if (!rulesHtml && !children) return null;

    return (
        <section className={`pool-card pool-rules-card ${className}`} style={{ "--pool-accent": accentColor }}>
            <h3>
                📋 {title}{subtitle && <><br />{subtitle}</>}
            </h3>
            <div className="pool-rules-content">
                {rulesHtml
                    ? <div dangerouslySetInnerHTML={{ __html: rulesHtml }} />
                    : children}
            </div>
        </section>
    );
}