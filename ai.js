/* AI starter prompts for each challenge.
   Built from the challenge's own sentence and steps, so every prompt is specific without hand-writing 400 of them.
   Design rules (from the research on AI tutors): the AI coaches and asks before it tells, gives hints before answers,
   never does the work, and checks against the exact "I can" sentence. K-1 prompts are for the guide running the Lab. */
(function (root) {
  'use strict';

  var TYPES = [
    // order matters: the first match wins; OVERRIDE fixes the few the patterns get wrong
    ['roleplay', /apolog|conflict|invite|stop power|\bsay no|a clear no|role-?play|negotiat|interview|conversation|disagree|compliment|greet|\bcall a\b|ask a grown-up|ask for help|requests?\b|peer pressure|mediat|make a friend|new friend|kid i don't know|stand up for|tell the person|upstander/i],
    ['build', /\bcode\b|coding|program (in|that)|scratch game|python|javascript|micro:bit|\bapp\b|teachable machine|tinkercad|spreadsheet/i],
    ['habit', /days? in a row|every (school )?day|each day|every week|for a month|for (a|one|\d+) weeks?|for a (school )?week|streak|routine|habit|\blog\b|tracking|track my|planner/i],
    ['write', /\bwrite (a|an|my|the|and|\d|down|to|or|rules|if|what|its)|written how-to|essay|poem|comic|script|letter\b|picture book|article|blog|newsletter|fiction/i],
    ['talk', /speech|\btalk\b|\bpresent (\d|to|my|an?|the|both|it|their|our|what)|\bpitch (to|my|a|an)\b|perform|\bteach (it|a|my|the|\d|to|wildlife|one)|explain (the|a|an|its|it|why|how|each)|lead (my|a|the)|\bemcee|podcast|read aloud|tell (a|my|the)\b|retell|story night|campfire|toast|announce|debate|argue|persuad|case for|meeting/i],
    ['money', /\$|money|budget|profit|prices?\b|unit price|cost sheet|coins?\b|cents|loan|credit card|interest|invest|business|savings/i],
    ['know', /identify|recogni[sz]e|tell apart|\bname (\d+|all|every|the)\b|\bsort \d+|spot the|constellation|matching (a|the) (guide|key)|\bquiz/i],
    ['build', /build|cook|bake|sew|knit|\bfix|repair|craft|garden|grow|model|shelter|invent|prototype|bracelet|chain reaction|recipe|design|whittle|\bmake (a|an|my|something)\b/i],
    ['body', /\brun (\d|a mile|a 5k|without)|running|swim|jump|climb|pull-?up|push-?up|plank|\bbike|\bski(s|ing)?\b|skate|throw|catch|juggl|\bhike|carry|paddle|kick|dribble|\bmiles?\b|yards|\blaps?\b|stretch|cartwheel|handstand|sprint|slackline|jump rope/i]
  ];
  var OVERRIDE = { 'EN-04.4': 'body', 'CG-05.2': 'body', 'CG-05.3': 'body', 'CG-05.4': 'body', 'CG-05.5': 'body', 'CG-06.3': 'coach', 'NL-25.3': 'build',
    'AI-12.1': 'coach', 'FE-11.2': 'coach', 'VC-06.2': 'coach', 'EN-07.5': 'coach', 'AI-09.1': 'coach', 'CG-08.4': 'coach', 'AI-10.3': 'build', 'VC-08.5': 'coach',
    'VC-04.5': 'money', 'VC-04.6': 'money', 'CG-11.1': 'talk', 'SP-08.4': 'talk', 'SP-02.5': 'talk' };
  var RISKY = /fire|flame|knife|knives|blade|\bsaws?\b(?! (a|an|the|what|it|how|someone))|\baxe|hatchet|power tool|\btools?\b|stove|oven|\bcook|\bbake|\bhot\b|\bwater\b|swim|river|creek|lake|pond|\bice\b|climb|height|ladder|roof|forag|edible|mushroom|berr(y|ies)|wild (food|plant|animal)|wildlife|moose|\bbike|\bski(s|ing)?\b|sled|backcountry|summit|overnight|below freezing/i;

  function kind(c) {
    if (OVERRIDE[c.id]) return OVERRIDE[c.id];
    if (c.p === 'l' || c.p === 't') return 'habit';
    var t = c.t;
    for (var i = 0; i < TYPES.length; i++) {
      if (TYPES[i][0] === 'money' && /no money/i.test(t)) continue;
      if (TYPES[i][1].test(t)) return TYPES[i][0];
    }
    return 'coach';
  }
  function who(c) {
    return c.b === '2–4' ? 'I\'m a student in grades 2 to 4 (about 7 to 10 years old).'
                         : 'I\'m a student in grades 5 to 8 (about 10 to 14 years old).';
  }
  function plain(c) { return c.b === '2–4' ? 'Use short, simple sentences.' : 'Keep it short and clear.'; }
  function q(c) { return '"' + c.t + '"'; }
  function steps(c) {
    if (!c.how || !c.how.length) return '';
    return (c.b === 'K–1' ? '\nThe steps:\n' : '\nMy guide\'s steps:\n') + c.how.map(function (s, i) { return (i + 1) + '. ' + s; }).join('\n') + '\n';
  }
  function safety(c) {
    return (c.gate || c.p === 's' || RISKY.test(c.t + ' ' + (c.how || []).join(' ')))
      ? (c.b === 'K–1'
        ? '\nThis challenge has a safety part. Don\'t state safety rules as if you\'re sure; flag anything about safety for me to check myself.'
        : '\nThis challenge has a safety part. Don\'t give me safety rules as if you\'re sure. Tell me to check anything about fire, tools, water, heights, weather, or wild plants and animals with my guide.') : '';
  }
  function hobby(c) {
    return (c.hob && c.hob.length) ? '\nAsk me what my favorite hobby is, and if it fits, suggest a way to do this challenge through it.' : '';
  }

  var COACH = {
    roleplay: ['Practice the scene', 'The AI plays the other person so you can rehearse.', function (c) {
      return 'Let\'s practice for this challenge: ' + q(c) + '\n\nYou play the other person. Start the scene and stay in character. Make it a little hard for me, like real life. ' +
        'After 3 or 4 turns, step out of the scene and tell me one thing I did well and one thing to try next time. Then we can go again. ' + plain(c); }],
    money: ['Check my numbers', 'Work through the math together, step by step.', function (c) {
      return 'Help me with the money part of this challenge: ' + q(c) + '\n\nAsk me for my numbers first (prices, costs, how many). Then let me try each step of the math myself, and check my work. ' +
        'If I make a mistake, give me a hint, not the answer. ' + plain(c); }],
    write: ['Tips on my draft', 'Paste your draft and get 2 kind, specific tips.', function (c) {
      return 'I\'m working on this challenge: ' + q(c) + '\n\nI\'ll paste my draft next. Give me 2 kind, specific tips that would make it better for this challenge. ' +
        'Don\'t rewrite it and don\'t add sentences of your own, because the work has to be mine. If part of the challenge is missing from my draft, tell me which part. ' + plain(c); }],
    talk: ['Be my audience', 'Practice out loud, then get questions and one tip.', function (c) {
      return 'Be my practice audience for this challenge: ' + q(c) + '\n\nI\'ll tell you what I plan to say. Then ask me 2 questions a real listener would ask, and give me one kind, specific tip. ' +
        'Don\'t write it for me. ' + plain(c); }],
    know: ['Quiz me', 'One question at a time, with hints before answers.', function (c) {
      return 'Quiz me to get ready for this challenge: ' + q(c) + '\n\nAsk one question at a time and wait for my answer. If I\'m wrong, give me a hint before telling me. ' +
        'Keep score, and after 10 questions tell me what to study next. If you\'re not sure about a fact, say so, because my guide will check with a real field guide or expert. ' + plain(c); }],
    body: ['Coach the skill', 'Common mistakes, a drill for each, and a safe build-up.', function (c) {
      return 'Coach me on the skill in this challenge: ' + q(c) + '\n\nWhat are the 3 most common mistakes beginners make, and one drill to fix each? ' +
        'Then ask me what I can do now, and make me a practice schedule that builds up over 2 weeks. If it\'s a physical skill, start each session with a warm-up and tell me how to stay safe. ' + plain(c); }],
    build: ['Plan the build', 'Sketch it, spot what could go wrong, and test it.', function (c) {
      return 'Help me figure out how to make this: ' + q(c) + '\n\nAsk me what materials and tools I have. Then help me sketch a plan, list what could go wrong, and come up with a simple test to check it works. ' +
        'Give me hints when I\'m stuck, not the finished design. ' + plain(c); }],
    habit: ['Stick with it', 'A tracking chart and a plan for hard days.', function (c) {
      return 'Help me stick with this challenge: ' + q(c) + '\n\nHelp me make a simple tracking chart, pick a time or place that reminds me to do it each day, and plan what I\'ll do on a hard day. ' +
        'Each time I come back, ask me how it went since last time. ' + plain(c); }],
    coach: ['Get unstuck', 'Small hints, one at a time.', function (c) {
      return 'I\'m stuck on this challenge: ' + q(c) + '\n\nAsk me what I\'ve tried so far. Then give me one hint at a time, the smallest one first, until I can take the next step myself. ' + plain(c); }]
  };

  function prompts(c) {
    if (c.b === 'K–1') {
      return [
        ['Plan the Lab', 'A hook, the activity, materials and a lightning test.',
         'I\'m a guide at Wilderland, a nature-based microschool, leading a K–1 crew (ages 5 to 7). Here\'s the challenge:\n' + q(c) + '\n' + steps(c) +
         '\nPlan a 30 to 45 minute Lab for it: a short hook to open, the activity, and a quick lightning test at the end to see who passes. List the materials. Keep it hands-on, and outdoors when it can be.' + safety(c)],
        ['Support and stretch', 'Help a child who\'s stuck, and stretch one who passes early.',
         'For this K–1 challenge: ' + q(c) + '\n\nGive me 3 ways to support a child who is stuck, frustrated or shy, and 2 ways to stretch a child who passes early, without lowering the standard. Keep each idea to one or two sentences.'],
        ['A story to start', 'A one-minute story or song to spark the crew.',
         'Write a one-minute story or a short song for 5 to 7 year olds that gets them excited about this challenge: ' + q(c) + '\n\nUse simple words and set it outdoors in the mountains. Don\'t give away how to do it; end on a question for the crew.']
      ];
    }
    var k = kind(c), coach = COACH[k];
    var epic = c.z === 'Epic' && c.st && c.st.length
      ? '\nThis is an Epic with 3 checkpoints:\n' + c.st.map(function (s, i) { return (i + 1) + '. ' + s; }).join('\n') + '\nHelp me put a date on each checkpoint.\n' : '';
    return [
      ['Make a plan', 'Turn the challenge into small steps for this week.',
       'You\'re my coach for a challenge at my school. ' + who(c) + '\n\nMy challenge: ' + q(c) + '\n' + steps(c) + epic +
       '\nHelp me make a plan to get ready. First ask me 2 questions, one at a time: what I can already do, and what I have to work with. ' +
       'Then give me a plan of 3 to 5 small steps, with a day for each. Coach me, but don\'t do the challenge for me. ' + plain(c) + hobby(c) + safety(c)],
      [coach[0], coach[1], coach[2](c)],
      ['Am I ready?', 'An honest check against the exact standard.',
       'I want to pass this challenge: ' + q(c) + '\n\nMy guide checks it in person, and there\'s no partial credit: every part of the sentence has to be true. ' +
       'Ask me questions, one at a time, to find out if I\'m ready. Be honest. If any part isn\'t there yet, tell me exactly what\'s missing and how to practice it. ' +
       'Don\'t tell me I\'m ready unless every part is met. ' + plain(c)]
    ];
  }

  root.WLAI = { prompts: prompts, kind: kind };
  if (typeof module !== 'undefined') module.exports = root.WLAI;
})(typeof window !== 'undefined' ? window : this);
