/**
 * Victory vs Alex - Fighter Profiles, Move Data & Frames
 */

const FIGHTERS = {
    VICTORY: {
        id: 'VICTORY',
        name: 'VICTORY',
        nickname: 'THE IRON SOVEREIGN',
        stance: 'Orthodox',
        height: 192,
        weight: '215 lbs / Heavyweight',
        reach: '79 in',
        record: '28-0 (26 KOs)',
        description: 'A crushing orthodox powerhouse. Heavy hands, bone-shattering body blows, and devastating counter uppercuts.',
        
        // Base Stats (Scales & Multipliers)
        maxHealth: 1000,
        maxStamina: 100,
        staminaRegen: 0.35,
        moveSpeed: 4.8,
        dashSpeed: 14.0,
        dashDuration: 12,
        weightClass: 'Heavy',

        // Color Palette for procedural vector rendering
        palette: {
            skin: '#c68b59',
            skinShadow: '#a26b3e',
            skinHighlight: '#ddaa7b',
            hair: '#1a1412',
            trunksPrimary: '#b91c1c',      // Crimson Red
            trunksSecondary: '#f59e0b',    // Gold Trim
            trunksWaistband: '#111827',    // Dark waistband
            glovesPrimary: '#dc2626',      // Red Gloves
            glovesSecondary: '#fbbf24',    // Gold Wrist Wrap & Knuckle Laces
            bootsPrimary: '#991b1b',       // Deep Crimson
            bootsSecondary: '#fbbf24',     // Gold Trim
            auraColor: 'rgba(245, 158, 11, 0.7)',
            superName: 'TITAN OVERDRIVE'
        },

        // Move Data Definitions
        moves: {
            JAB: {
                name: 'Heavy Jab',
                type: 'attack',
                startup: 7,
                active: 5,
                recovery: 8,
                damage: 55,
                staminaCost: 8,
                staminaDamage: 12,
                range: 110,
                height: 'high',
                hitstun: 16,
                blockstun: 10,
                knockback: 6,
                sfx: 'jab'
            },
            CROSS: {
                name: 'Straight Right',
                type: 'attack',
                startup: 12,
                active: 6,
                recovery: 14,
                damage: 110,
                staminaCost: 15,
                staminaDamage: 22,
                range: 135,
                height: 'high',
                hitstun: 24,
                blockstun: 14,
                knockback: 14,
                sfx: 'hook'
            },
            BODY_HOOK: {
                name: 'Liver Breaker',
                type: 'attack',
                startup: 15,
                active: 7,
                recovery: 16,
                damage: 140,
                staminaCost: 20,
                staminaDamage: 40,
                range: 95,
                height: 'mid',
                hitstun: 28,
                blockstun: 18,
                knockback: 10,
                sfx: 'hook',
                isBodyShot: true
            },
            UPPERCUT: {
                name: 'Iron Uppercut',
                type: 'attack',
                startup: 18,
                active: 7,
                recovery: 20,
                damage: 185,
                staminaCost: 24,
                staminaDamage: 30,
                range: 105,
                height: 'high',
                hitstun: 34,
                blockstun: 20,
                knockback: 20,
                launchY: -12,
                sfx: 'heavy'
            },
            SUPER: {
                name: 'TITAN OVERDRIVE',
                type: 'super',
                startup: 10,
                active: 60,
                recovery: 25,
                damage: 420,
                staminaCost: 0,
                superCost: 100,
                range: 140,
                height: 'all',
                hitstun: 50,
                blockstun: 30,
                knockback: 35,
                launchY: -18,
                sfx: 'super'
            },
            WEAVE: {
                name: 'Sway Back',
                type: 'dodge',
                startup: 2,
                active: 18,
                recovery: 10,
                staminaCost: 14
            },
            GUARD: {
                name: 'Iron Guard',
                type: 'guard',
                damageReduction: 0.85,
                staminaDrainPerHit: 12
            }
        }
    },

    ALEX: {
        id: 'ALEX',
        name: 'ALEX',
        nickname: 'THE EMERALD HURRICANE',
        stance: 'Southpaw',
        height: 184,
        weight: '175 lbs / Middleweight',
        reach: '75 in',
        record: '25-1 (18 KOs)',
        description: 'A blisteringly fast southpaw outboxer. Unmatched slip footwork, rapid multi-jab blitzes, and leaping gazelle hooks.',

        // Base Stats
        maxHealth: 920,
        maxStamina: 110,
        staminaRegen: 0.45,
        moveSpeed: 5.6,
        dashSpeed: 17.0,
        dashDuration: 10,
        weightClass: 'Medium',

        // Color Palette
        palette: {
            skin: '#dfb18c',
            skinShadow: '#b98864',
            skinHighlight: '#eed0b4',
            hair: '#b48a52',               // Honey Blonde
            trunksPrimary: '#059669',      // Emerald Green
            trunksSecondary: '#e2e8f0',    // Chrome Silver Stripes
            trunksWaistband: '#047857',    // Deep Emerald
            glovesPrimary: '#0d9488',      // Teal / Emerald Gloves
            glovesSecondary: '#f8fafc',    // Silver Knuckle Trim
            bootsPrimary: '#0f766e',       // Teal Boots
            bootsSecondary: '#f1f5f9',     // Silver Trim
            auraColor: 'rgba(16, 185, 129, 0.7)',
            superName: 'TEMPEST FLURRY'
        },

        // Move Data Definitions
        moves: {
            JAB: {
                name: 'Flash Flick Jab',
                type: 'attack',
                startup: 5,
                active: 4,
                recovery: 6,
                damage: 42,
                staminaCost: 6,
                staminaDamage: 8,
                range: 115,
                height: 'high',
                hitstun: 14,
                blockstun: 8,
                knockback: 4,
                canChain: true,
                sfx: 'jab'
            },
            CROSS: {
                name: 'Corkscrew Straight',
                type: 'attack',
                startup: 9,
                active: 5,
                recovery: 10,
                damage: 92,
                staminaCost: 12,
                staminaDamage: 16,
                range: 130,
                height: 'high',
                hitstun: 20,
                blockstun: 12,
                knockback: 10,
                sfx: 'hook'
            },
            BODY_HOOK: {
                name: 'Cyclone Body Hook',
                type: 'attack',
                startup: 12,
                active: 6,
                recovery: 12,
                damage: 115,
                staminaCost: 16,
                staminaDamage: 32,
                range: 100,
                height: 'mid',
                hitstun: 24,
                blockstun: 15,
                knockback: 8,
                sfx: 'hook',
                isBodyShot: true
            },
            UPPERCUT: {
                name: 'Gazelle Punch',
                type: 'attack',
                startup: 14,
                active: 6,
                recovery: 16,
                damage: 160,
                staminaCost: 20,
                staminaDamage: 24,
                range: 125,
                height: 'high',
                hitstun: 30,
                blockstun: 18,
                knockback: 16,
                launchY: -10,
                lungeX: 45,
                sfx: 'heavy'
            },
            SUPER: {
                name: 'TEMPEST FLURRY',
                type: 'super',
                startup: 8,
                active: 65,
                recovery: 20,
                damage: 390,
                staminaCost: 0,
                superCost: 100,
                range: 145,
                height: 'all',
                hitstun: 50,
                blockstun: 30,
                knockback: 30,
                launchY: -16,
                sfx: 'super'
            },
            WEAVE: {
                name: 'Bob & Weave',
                type: 'dodge',
                startup: 2,
                active: 22,
                recovery: 8,
                staminaCost: 10
            },
            GUARD: {
                name: 'Peek-a-Boo Guard',
                type: 'guard',
                damageReduction: 0.80,
                staminaDrainPerHit: 14
            }
        }
    }
};

window.FIGHTERS = FIGHTERS;
