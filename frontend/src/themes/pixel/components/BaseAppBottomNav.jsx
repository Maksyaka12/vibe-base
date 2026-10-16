import React from 'react';
import {
  ArrowLeftRight,
  Crown,
  Gift,
  CheckCircle2,
  User
} from 'lucide-react';

export function BaseAppBottomNav({ activeTab, onSelectTab }) {
  const navItems = [
    {
      id: 'buy',
      label: 'BUY',
      icon: ArrowLeftRight,
    },
    {
      id: 'vibeclub',
      label: 'MINT NFT',
      icon: Crown,
    },
    {
      id: 'hub',
      label: 'REWARDS HUB',
      icon: Gift,
      isCenter: true
    },
    {
      id: 'claim',
      label: 'CLAIM',
      icon: CheckCircle2,
    },
    {
      id: 'profile',
      label: 'PROFILE',
      icon: User,
    }
  ];

  return (
    <nav
      className="base-app-bottom-nav"
      style={{
        position: 'fixed',
        bottom: 0,
        top: 'auto',
        left: 0,
        right: 0,
        width: '100%',
        height: '62px',
        zIndex: 99999,
        background: 'rgba(2, 11, 26, 0.92)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderTop: '1px solid rgba(0, 245, 255, 0.2)',
        boxShadow: '0 -6px 24px rgba(0, 0, 0, 0.8), 0 -1px 0 rgba(0, 245, 255, 0.15)',
        paddingTop: '5px',
        paddingBottom: 'calc(10px + env(safe-area-inset-bottom, 0px))',
        boxSizing: 'border-box',
        transform: 'translate3d(0, 0, 0)',
        WebkitTransform: 'translate3d(0, 0, 0)',
        overflow: 'visible'
      }}
    >
      <div
        style={{
          maxWidth: '720px',
          margin: '0 auto',
          height: '100%',
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: '2px',
          padding: '0 4px',
          boxSizing: 'border-box',
          overflow: 'visible',
          alignItems: 'center'
        }}
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          if (item.isCenter) {
            return (
              <button
                key={item.id}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  onSelectTab(item.id);
                }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  background: 'transparent',
                  border: 'none',
                  padding: '0 2px 2px 2px',
                  height: '100%',
                  cursor: 'pointer',
                  touchAction: 'manipulation',
                  WebkitTapHighlightColor: 'transparent',
                  position: 'relative',
                  overflow: 'visible'
                }}
              >
                {/* Protruding Floating Circle (Always Cyan with Dark Navy Icon) */}
                <div
                  style={{
                    position: 'absolute',
                    top: '-20px',
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #00f5ff 0%, #00d2eb 100%)',
                    border: isActive ? '2.5px solid #ffffff' : '2px solid rgba(255, 255, 255, 0.8)',
                    boxShadow: isActive
                      ? '0 0 18px rgba(0, 245, 255, 0.9), 0 4px 10px rgba(0, 0, 0, 0.6)'
                      : '0 0 10px rgba(0, 245, 255, 0.5), 0 3px 8px rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.15s ease',
                    transform: isActive ? 'scale(1.06)' : 'scale(1)'
                  }}
                >
                  <Icon
                    size={22}
                    color="#020b1a"
                    strokeWidth={2.6}
                  />
                </div>

                <span
                  style={{
                    fontFamily: "'Press Start 2P', monospace",
                    fontSize: '5.5px',
                    fontWeight: 900,
                    letterSpacing: '0.15px',
                    whiteSpace: 'nowrap',
                    lineHeight: 1,
                    color: isActive ? '#00f5ff' : '#88aacc',
                    textShadow: isActive ? '0 0 8px rgba(0, 245, 255, 0.6)' : 'none',
                    marginTop: '24px'
                  }}
                >
                  {item.label}
                </span>
              </button>
            );
          }
          
          return (
            <button
              key={item.id}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                onSelectTab(item.id);
              }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                height: '100%',
                background: isActive ? 'rgba(0, 245, 255, 0.08)' : 'transparent',
                border: 'none',
                borderRadius: '8px',
                padding: '4px 2px',
                cursor: 'pointer',
                touchAction: 'manipulation',
                WebkitTapHighlightColor: 'transparent',
                transition: 'all 0.15s ease',
                color: isActive ? '#00f5ff' : '#88aacc',
                boxShadow: isActive ? 'inset 0 0 10px rgba(0, 245, 255, 0.15)' : 'none'
              }}
            >
              <Icon
                size={18}
                color={isActive ? '#00f5ff' : '#88aacc'}
                strokeWidth={isActive ? 2.5 : 2}
                style={{
                  filter: isActive ? 'drop-shadow(0 0 6px rgba(0, 245, 255, 0.6))' : 'none',
                  transition: 'all 0.15s ease'
                }}
              />
              <span
                style={{
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: '5.5px',
                  fontWeight: 900,
                  letterSpacing: '0.2px',
                  whiteSpace: 'nowrap',
                  lineHeight: 1,
                  color: isActive ? '#00f5ff' : '#88aacc',
                  textShadow: isActive ? '0 0 8px rgba(0, 245, 255, 0.6)' : 'none'
                }}
              >
                {item.label}
              </span>
              {isActive ? (
                <span
                  style={{
                    width: '3px',
                    height: '3px',
                    borderRadius: '50%',
                    background: '#00f5ff',
                    boxShadow: '0 0 6px #00f5ff',
                    marginTop: '-1px'
                  }}
                />
              ) : (
                <span style={{ width: '3px', height: '3px', marginTop: '-1px' }} />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
