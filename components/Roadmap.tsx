import React from 'react';
import { CheckCircle2, Circle, Gamepad2, Sparkles, Wrench, Zap, Code } from 'lucide-react';
import { useData } from '../context/DataContext';

const Roadmap: React.FC = () => {
  const { roadmapProjects } = useData();

  const getIcon = (type: string, className: string) => {
    switch (type) {
      case 'gamepad': return <Gamepad2 className={className} size={28} />;
      case 'sparkles': return <Sparkles className={className} size={28} />;
      case 'wrench': return <Wrench className={className} size={28} />;
      case 'zap': return <Zap className={className} size={28} />;
      case 'code': return <Code className={className} size={28} />;
      default: return <Sparkles className={className} size={28} />;
    }
  };

  return (
    <section id="roadmap" className="py-24 relative overflow-hidden scanline-overlay" style={{ background: '#10111a' }}>
      <div className="absolute inset-0 grid-bg opacity-40 pointer-events-none" />
      <div className="absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(0,212,255,0.05) 0%, transparent 70%)' }} />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="flex items-center gap-4 mb-4">
          <div className="h-px w-12" style={{ background: '#00d4ff' }} />
          <span className="font-orbitron text-xs tracking-widest uppercase" style={{ color: '#00d4ff' }}>// DEV ROADMAP</span>
          <div className="h-px flex-1" style={{ background: 'linear-gradient(to right, #00d4ff, transparent)' }} />
        </div>
        <div className="mb-16">
          <h2 className="font-orbitron font-black text-white mb-4" style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)' }}>
            DEVELOPMENT <span className="neon-cyan">ROADMAP</span>
          </h2>
          <p className="text-gray-500">Track the detailed progress of my projects and upcoming updates.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {roadmapProjects.map((project, pi) => {
            const totalSteps = project.sections.reduce((acc, s) => acc + s.steps.length, 0);
            const completedSteps = project.sections.reduce((acc, s) => acc + s.steps.filter(st => st.isCompleted).length, 0);
            const progress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;
            const accentColor = pi === 0 ? '#00d4ff' : '#a855f7';
            const accentRgb = pi === 0 ? '0,212,255' : '168,85,247';

            const statusColors: Record<string, string> = { active: '#00d4ff', planned: '#a855f7', completed: '#22c55e', 'on-hold': '#f59e0b' };
            const statusColor = statusColors[project.status || 'active'] || accentColor;

            return (
              <div
                key={project.id}
                className="flex flex-col h-full transition-all duration-300 overflow-hidden"
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: `1px solid rgba(${accentRgb},0.2)`,
                  clipPath: 'polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 0 100%)',
                }}
              >
                {/* Cover image */}
                {project.imageUrl && (
                  <div className="relative flex-shrink-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)', minHeight: '8rem', maxHeight: '16rem' }}>
                    <img src={project.imageUrl} alt={project.title} className="w-full object-contain" style={{ maxHeight: '16rem' }} />
                    <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(to bottom, transparent 60%, rgba(13,14,18,0.85))' }} />
                    {project.status && (
                      <span className="absolute top-2 right-2 font-orbitron text-[10px] font-bold px-2 py-0.5 uppercase tracking-widest"
                        style={{ background: `${statusColor}22`, border: `1px solid ${statusColor}66`, color: statusColor }}>
                        {project.status}
                      </span>
                    )}
                  </div>
                )}

                <div className="p-6 flex flex-col flex-1">
                {/* Project Header */}
                <div className="flex items-center gap-4 mb-6">
                  {project.imageUrl ? (
                    <div className="p-2.5 flex-shrink-0" style={{ background: `rgba(${accentRgb},0.1)`, border: `1px solid rgba(${accentRgb},0.3)` }}>
                      {getIcon(project.iconType, "text-white")}
                    </div>
                  ) : (
                    <div className="p-3 flex-shrink-0" style={{ background: `rgba(${accentRgb},0.1)`, border: `1px solid rgba(${accentRgb},0.3)` }}>
                      {getIcon(project.iconType, "text-white")}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-orbitron font-bold text-white text-lg truncate">{project.title}</h3>
                      {!project.imageUrl && project.status && (
                        <span className="font-orbitron text-[10px] font-bold px-2 py-0.5 uppercase tracking-widest flex-shrink-0"
                          style={{ background: `${statusColor}22`, border: `1px solid ${statusColor}66`, color: statusColor }}>
                          {project.status}
                        </span>
                      )}
                    </div>
                    {project.description && <p className="text-gray-500 text-xs mt-0.5 line-clamp-1">{project.description}</p>}
                    <div className="w-full h-1 mt-2 overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                      <div
                        className="h-full transition-all duration-1000"
                        style={{ width: `${progress}%`, background: `linear-gradient(to right, ${accentColor}, ${pi === 0 ? '#a855f7' : '#ec4899'})`, boxShadow: `0 0 8px ${accentColor}` }}
                      />
                    </div>
                  </div>
                  <span className="font-orbitron text-xs flex-shrink-0" style={{ color: accentColor }}>{Math.round(progress)}%</span>
                </div>

                {/* Sections */}
                <div className="space-y-6 flex-1">
                  {project.sections.map((section) => (
                    <div key={section.id}>
                      <h4 className="font-orbitron text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2" style={{ color: accentColor }}>
                        <span className="h-px w-4 inline-block" style={{ background: accentColor }} />
                        {section.title}
                      </h4>
                      <div className="space-y-2 pl-4">
                        {section.steps.map((step) => (
                          <div key={step.id} className="flex items-center gap-3">
                            {step.isCompleted ? (
                              <CheckCircle2 size={14} className="flex-shrink-0" style={{ color: accentColor }} />
                            ) : (
                              <Circle size={14} className="text-gray-700 flex-shrink-0" />
                            )}
                            <span className={`text-sm ${step.isCompleted ? 'text-gray-300' : 'text-gray-600'}`}>{step.text}</span>
                          </div>
                        ))}
                        {section.steps.length === 0 && (
                          <p className="text-xs text-gray-700 italic font-mono">// No steps planned yet</p>
                        )}
                      </div>
                    </div>
                  ))}
                  {project.sections.length === 0 && (
                    <p className="text-gray-700 text-sm font-mono italic">// Planning in progress...</p>
                  )}
                </div>
                </div>{/* end p-6 */}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Roadmap;
