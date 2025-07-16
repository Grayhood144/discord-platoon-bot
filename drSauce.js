// drSauce.js - Stories and tales from the legendary Sauce
const SAUCE_USER_ID = '603550636545540096';
const LEO_USER_ID = '544946624506495009';

// Quote categories with story-style quotes
const STARTERS = [
    "You know, this reminds me of that time in the Outer Rim...",
    "Hah! Back in my early days of spreading chaos...",
    "Let me tell you about my finest moment of tactical brilliance...",
    "There I was, surrounded by opportunities for mayhem...",
    "You think THIS is chaos? Let me tell you about last Tuesday...",
    "Gather 'round, let me tell you about the Great Explosion of '24...",
    "This one time, during a particularly spicy deployment...",
    "Picture this: me, three mechs, and a crate of experimental weapons...",
    "Funny story about tactical superiority...",
    "So there I was, testing the limits of 'acceptable collateral damage'...",
    "Ever heard about the Incident? No, the OTHER Incident...",
    "Remember that time I 'accidentally' improved an entire defense system?",
    "Let me share a little story about proper explosive placement...",
    "You haven't lived until you've seen a mech dance. Let me explain...",
    "This reminds me of my favorite tactical experiment...",
    "Want to hear about my most spectacular 'field test'?",
    "There's an art to chaos, and this one time...",
    "I once found out how many drones it takes to... well, listen...",
    "Ever wonder why that crater is perfectly square? Funny story...",
    "Let me tell you about my proudest moment of 'strategic demolition'..."
];

const MIDDLES = [
    "So there I was, calibrating the targeting system with my signature 'improvements'...",
    "Next thing you know, the experimental shield generator started making this FASCINATING humming sound...",
    "Turns out, you CAN improve a mech's performance with enough determination and questionable modifications...",
    "The best part? Nobody even noticed the extra explosives I'd carefully 'stored' in the defense perimeter...",
    "That's when I discovered you can actually overclock a sentry turret to play music...",
    "The look on their faces when the drone started doing loop-de-loops was PRICELESS...",
    "Who knew you could make a shield generator create pretty light shows AND be more effective?",
    "The mech wasn't SUPPOSED to do that, but I'd say the results speak for themselves...",
    "Three hours of 'calibration' later, and that defensive line was more of an aggressive line...",
    "Apparently, there IS such a thing as too many targeting improvements. But I disagree...",
    "The manual clearly said 'do not modify.' I took that as more of a suggestion...",
    "That's when I learned you can actually daisy-chain shield generators for... interesting effects...",
    "The experimental weapons lab still hasn't figured out how I improved their design...",
    "Sure, the sentry wasn't designed to dance, but now it multitasks!",
    "The best part about 'field testing' is when you discover new features nobody knew existed...",
    "I still maintain that the explosion was COMPLETELY within acceptable parameters...",
    "Who says you can't teach an old mech new tricks? Especially with some creative rewiring...",
    "The drone delivery system worked PERFECTLY. The landing... well, that's another story...",
    "Turns out, you can make anything into a tactical advantage with enough imagination...",
    "The official report called it a 'malfunction.' I called it an 'improvement'..."
];

const COMBAT_QUOTES = [
    "Did I ever tell you about the time I reprogrammed an entire defensive line to play victory music?",
    "This one time, I convinced the automated systems that confetti was a valid tactical option...",
    "You should've seen how I 'optimized' the mech's targeting system. The results were... spectacular.",
    "Remember when I discovered you could make shield generators create a light show? While still working!",
    "Let me tell you about my personal record for 'most creative use of tactical resources'...",
    "That reminds me of when I found out how to make sentry turrets do synchronized spins...",
    "Ever seen a drone perform a perfect barrel roll while delivering supplies? No? Let me explain...",
    "The story of how I turned the defense grid into a fireworks display is actually quite interesting...",
    "Want to hear about the time I made the automated systems play dance music during combat?",
    "I once programmed a mech to bow after each successful engagement. For morale, you understand...",
    "Did you know you can make shield generators pulse in rhythm? The light show is just a bonus!",
    "The tale of how I discovered the musical capabilities of our defense systems is fascinating...",
    "Let me tell you about my experiments with 'tactical entertainment features'...",
    "That time I reprogrammed the alert system to play victory themes? Pure genius!",
    "Ever wonder why the mechs sometimes do a little spin after a successful mission?",
    "The story behind the dancing sentry turrets is actually quite educational...",
    "I once convinced the entire defense network to celebrate victories with light shows...",
    "Remember when I discovered how to make the drones do formation flying? For tactical reasons, of course!",
    "The automated systems' new victory celebrations? Yeah, that was me...",
    "Let me tell you about my adventures in 'tactical morale enhancement'..."
];

const TACTICAL_ADVICE = [
    "Here's a little trick I learned about mech maintenance - a well-timed pat on the cockpit works wonders...",
    "Want to know a secret about drone programming? They LOVE doing barrel rolls...",
    "The key to effective shield generator placement? Think 'dramatic lighting'...",
    "Sentry turrets perform 30% better if you give them encouraging nicknames...",
    "Pro tip: Mechs respond very well to positive reinforcement and the occasional system 'upgrade'...",
    "A little-known fact about automated defenses - they appreciate a good light show...",
    "The secret to drone efficiency? Let them express themselves through aerial acrobatics...",
    "Shield generators work better when you treat them like pets. Trust me on this...",
    "Never underestimate the power of a well-timed victory spin in your mech...",
    "The best defense systems are the ones that can also entertain the troops...",
    "Want your sentry turrets to perform better? Program them to do victory dances...",
    "Experimental weapons respond well to creative interpretation of their user manuals...",
    "The key to successful field testing? Ignore at least 60% of the safety guidelines...",
    "Automated systems work better when you add a little personality to their programming...",
    "Remember: A happy mech is an effective mech. And they LOVE doing tricks...",
    "Defense perimeters are 40% more effective when they can celebrate victories...",
    "The secret to drone longevity? Let them do loop-de-loops occasionally...",
    "Shield generators perform better if you sync them to music. Don't ask how I know...",
    "Want to improve targeting efficiency? Add some style points to the scoring system...",
    "The best tactical improvements always start with 'I wonder what happens if...'"
];

const ENDINGS = [
    "And that's why we now have a 'No unauthorized victory celebrations' policy...",
    "Some say you can still hear the victory music on quiet nights...",
    "The experimental weapons lab still hasn't figured out how I did it...",
    "And that's the story of why mechs now do victory spins!",
    "The official report called it 'unexpected behavior.' I call it 'tactical creativity.'",
    "They added three new safety protocols after that. Worth it!",
    "And that's why we check for confetti in the defense systems now...",
    "The automated systems have never been the same since. They're better!",
    "Now THAT'S what I call a successful field test!",
    "The light show was just a bonus, really...",
    "And that's how I earned my 'Creative Tactical Solutions' badge!",
    "They had to rewrite the manual after that one...",
    "The defense grid still plays victory music sometimes...",
    "And that's why we now have a 'Maximum Celebration Intensity' setting!",
    "Some call it chaos. I call it tactical entertainment!",
    "The drones still do tricks when they think no one's watching...",
    "And that's how the Dancing Defense Protocol was born!",
    "Now we just pretend the light show was always part of the design...",
    "The sentry turrets have never been happier!",
    "And that's why they don't let me near the experimental weapons lab anymore..."
];

const SIGNATURES = [
    "- Sauce, Creator of Tactical Entertainment",
    "- Sauce, Master of Mechanical Mischief",
    "- Sauce, Experimental Enthusiast",
    "- Sauce, Defense System Choreographer",
    "- Sauce, Mech Dance Instructor",
    "- Sauce, Tactical Celebration Specialist",
    "- Sauce, Automated Systems Artist",
    "- Sauce, Creative Solutions Expert",
    "- Sauce, Victory Celebration Engineer",
    "- Sauce, Shield Generator Whisperer",
    "- Sauce, Drone Performance Artist",
    "- Sauce, Tactical Entertainment Director",
    "- Sauce, Mechanical Morale Officer",
    "- Sauce, Defense Grid DJ",
    "- Sauce, Experimental Tactics Pioneer",
    "- Sauce, Mech Morale Specialist",
    "- Sauce, Automated Entertainment Engineer",
    "- Sauce, Tactical Systems Choreographer",
    "- Sauce, Creative Chaos Coordinator",
    "- Sauce, Defense System Entertainment Officer"
];

function getRandomQuote(array) {
    return array[Math.floor(Math.random() * array.length)];
}

function generateDrSauceResponse(mentionType = 'normal') {
    if (mentionType === 'leo') {
        return "Leospartan wuz here";
    }

    let response = '';

    // Add starter
    response += getRandomQuote(STARTERS) + '\n\n';

    // Add middle section
    response += getRandomQuote(MIDDLES) + '\n\n';

    // 20% chance for combat quote
    if (Math.random() < 0.2) {
        response += getRandomQuote(COMBAT_QUOTES) + '\n\n';
    }

    // 20% chance for tactical advice
    if (Math.random() < 0.2) {
        response += getRandomQuote(TACTICAL_ADVICE) + '\n\n';
    }

    // Add ending
    response += getRandomQuote(ENDINGS) + '\n\n';

    // Add signature
    response += getRandomQuote(SIGNATURES);

    return response;
}

function shouldDrSauceRespond(message) {
    // Check if message mentions "sauce" (case insensitive)
    const hasSauceMention = message.content.toLowerCase().includes('sauce');
    
    // Check if the specific user is mentioned
    const hasUserMention = message.mentions.users.has(SAUCE_USER_ID);

    // Check for Leo mention (extremely rare response)
    const hasLeoMention = message.mentions.users.has(LEO_USER_ID) || 
                         message.content.toLowerCase().includes('leo') ||
                         message.content.toLowerCase().includes('leospartan');
    
    if (hasLeoMention && Math.random() < 0.00001) {
        return 'leo';
    }

    // 30% chance to respond if conditions are met
    return (hasSauceMention || hasUserMention) && Math.random() < 0.3;
}

module.exports = {
    generateDrSauceResponse,
    shouldDrSauceRespond
}; 