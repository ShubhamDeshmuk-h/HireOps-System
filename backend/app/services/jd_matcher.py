import re

def match_score(jd: str, resume_skills: list, resume_keywords: list = None, experience: list = None, education: list = None, experience_years: int = 0, degree_level: str = "Not specified") -> float:
    """
    Simple scoring system that compares ALL words in job description with resume skills and keywords.
    """
    print(f"Match score input - JD: {jd[:200]}...")
    print(f"Resume skills: {resume_skills}")
    print(f"Resume keywords: {resume_keywords}")
    
    # Normalize inputs
    jd_lower = jd.lower()
    resume_skills = [s.lower().strip() for s in (resume_skills or []) if s and s.strip()]
    resume_keywords = [k.lower().strip() for k in (resume_keywords or []) if k and k.strip()]
    
    # Extract ALL meaningful words from job description
    jd_keywords = []
    
    # Split JD into words and clean them
    words = re.findall(r'\b[a-zA-Z0-9.#+\-()]+\b', jd_lower)
    
    # Filter out common stop words and short words
    stop_words = {
        'the', 'and', 'or', 'for', 'with', 'in', 'on', 'at', 'to', 'of', 'a', 'an', 'is', 'are', 'was', 'were', 
        'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 
        'might', 'must', 'can', 'this', 'that', 'these', 'those', 'but', 'they', 'have', 'from', 'each', 
        'which', 'she', 'do', 'how', 'their', 'if', 'up', 'out', 'many', 'then', 'them', 'these', 'so', 
        'some', 'her', 'would', 'make', 'like', 'into', 'him', 'time', 'two', 'more', 'go', 'no', 'way', 
        'could', 'my', 'than', 'first', 'been', 'call', 'who', 'its', 'now', 'find', 'long', 'down', 'day', 
        'did', 'get', 'come', 'made', 'may', 'part', 'over', 'new', 'sound', 'take', 'only', 'little', 
        'work', 'know', 'place', 'year', 'live', 'me', 'back', 'give', 'most', 'very', 'after', 'thing', 
        'our', 'just', 'name', 'good', 'sentence', 'man', 'think', 'say', 'great', 'where', 'help', 'through', 
        'much', 'before', 'line', 'right', 'too', 'mean', 'old', 'any', 'same', 'tell', 'boy', 'follow', 
        'came', 'want', 'show', 'also', 'around', 'form', 'three', 'small', 'set', 'put', 'end', 'does', 
        'another', 'well', 'large', 'must', 'big', 'even', 'such', 'because', 'turn', 'here', 'why', 'ask', 
        'went', 'men', 'read', 'need', 'land', 'different', 'home', 'us', 'move', 'try', 'kind', 'hand', 
        'picture', 'again', 'change', 'off', 'play', 'spell', 'air', 'away', 'animal', 'house', 'point', 
        'page', 'letter', 'mother', 'answer', 'found', 'study', 'still', 'learn', 'should', 'America', 
        'world', 'high', 'every', 'near', 'add', 'food', 'between', 'own', 'below', 'country', 'plant', 
        'last', 'school', 'father', 'keep', 'tree', 'never', 'start', 'city', 'earth', 'eye', 'light', 
        'thought', 'head', 'under', 'story', 'saw', 'left', 'don\'t', 'few', 'while', 'along', 'might', 
        'close', 'something', 'seem', 'next', 'hard', 'open', 'example', 'begin', 'life', 'always', 'those', 
        'both', 'paper', 'together', 'got', 'group', 'often', 'run', 'important', 'until', 'children', 
        'side', 'feet', 'car', 'mile', 'night', 'walk', 'white', 'sea', 'began', 'grow', 'took', 'river', 
        'four', 'carry', 'state', 'once', 'book', 'hear', 'stop', 'without', 'second', 'late', 'miss', 
        'idea', 'enough', 'eat', 'face', 'watch', 'far', 'Indian', 'real', 'almost', 'let', 'above', 
        'girl', 'sometimes', 'mountain', 'cut', 'young', 'talk', 'soon', 'list', 'song', 'being', 'leave', 
        'family', 'it\'s', 'body', 'music', 'color', 'stand', 'sun', 'questions', 'fish', 'area', 'mark', 
        'dog', 'horse', 'birds', 'problem', 'complete', 'room', 'knew', 'since', 'ever', 'piece', 'told', 
        'usually', 'didn\'t', 'friends', 'easy', 'heard', 'order', 'red', 'door', 'sure', 'become', 'top', 
        'ship', 'across', 'today', 'during', 'short', 'better', 'best', 'however', 'low', 'hours', 'black', 
        'products', 'happened', 'whole', 'measure', 'remember', 'early', 'waves', 'reached', 'listen', 
        'wind', 'rock', 'space', 'covered', 'fast', 'several', 'hold', 'himself', 'toward', 'five', 'step', 
        'morning', 'passed', 'vowel', 'true', 'hundred', 'against', 'pattern', 'numeral', 'table', 'north', 
        'slowly', 'money', 'map', 'farm', 'pulled', 'draw', 'voice', 'seen', 'cold', 'cried', 'plan', 'notice', 
        'south', 'sing', 'war', 'ground', 'fall', 'king', 'town', 'I\'ll', 'unit', 'figure', 'certain', 'field', 
        'travel', 'wood', 'fire', 'upon', 'done', 'English', 'road', 'half', 'ten', 'fly', 'gave', 'box', 
        'finally', 'wait', 'correct', 'oh', 'quickly', 'person', 'became', 'shown', 'minutes', 'strong', 
        'verb', 'stars', 'front', 'feel', 'fact', 'inches', 'street', 'decided', 'contain', 'course', 'surface', 
        'produce', 'building', 'ocean', 'class', 'note', 'nothing', 'rest', 'carefully', 'scientists', 'inside', 
        'wheels', 'stay', 'green', 'known', 'island', 'week', 'less', 'machine', 'base', 'ago', 'stood', 'plan', 
        'box', 'now', 'north', 'fine', 'certain', 'fly', 'fall', 'itself', 'grass', 'special', 'dry', 'wonder', 
        'laugh', 'thousand', 'ago', 'ran', 'check', 'game', 'shape', 'equate', 'hot', 'miss', 'brought', 'heat', 
        'snow', 'tire', 'bring', 'yes', 'distant', 'fill', 'east', 'paint', 'language', 'among', 'grand', 'ball', 
        'yet', 'wave', 'drop', 'heart', 'am', 'present', 'heavy', 'dance', 'engine', 'position', 'arm', 'wide', 
        'sail', 'material', 'size', 'vary', 'settle', 'speak', 'weight', 'general', 'ice', 'matter', 'circle', 
        'pair', 'include', 'divide', 'syllable', 'felt', 'perhaps', 'pick', 'sudden', 'count', 'square', 'reason', 
        'length', 'represent', 'art', 'subject', 'region', 'energy', 'hunt', 'probable', 'bed', 'brother', 'egg', 
        'ride', 'cell', 'believe', 'fraction', 'forest', 'sit', 'race', 'window', 'store', 'summer', 'train', 
        'sleep', 'prove', 'lone', 'leg', 'exercise', 'wall', 'catch', 'mount', 'wish', 'sky', 'board', 'joy', 
        'winter', 'sat', 'written', 'wild', 'instrument', 'kept', 'glass', 'grass', 'cow', 'job', 'edge', 'sign', 
        'visit', 'past', 'soft', 'fun', 'bright', 'gas', 'weather', 'month', 'million', 'bear', 'finish', 'happy', 
        'hope', 'flower', 'clothe', 'strange', 'gone', 'trade', 'melody', 'trip', 'office', 'receive', 'row', 
        'mouth', 'exact', 'symbol', 'die', 'least', 'trouble', 'shout', 'except', 'wrote', 'seed', 'tone', 'join', 
        'suggest', 'clean', 'break', 'lady', 'yard', 'rise', 'bad', 'blow', 'oil', 'blood', 'touch', 'grew', 
        'cent', 'mix', 'team', 'wire', 'cost', 'lost', 'brown', 'wear', 'garden', 'equal', 'sent', 'choose', 
        'fell', 'fit', 'flow', 'fair', 'bank', 'collect', 'save', 'control', 'decimal', 'gentle', 'woman', 
        'captain', 'practice', 'separate', 'difficult', 'doctor', 'please', 'protect', 'noon', 'whose', 'locate', 
        'ring', 'character', 'insect', 'caught', 'period', 'indicate', 'radio', 'spoke', 'atom', 'human', 'history', 
        'effect', 'electric', 'expect', 'crop', 'modern', 'element', 'hit', 'student', 'corner', 'party', 'supply', 
        'bone', 'rail', 'imagine', 'provide', 'agree', 'thus', 'capital', 'won\'t', 'chair', 'danger', 'fruit', 
        'rich', 'thick', 'soldier', 'process', 'operate', 'guess', 'necessary', 'sharp', 'wing', 'create', 
        'neighbor', 'wash', 'bat', 'rather', 'crowd', 'corn', 'compare', 'poem', 'string', 'bell', 'depend', 
        'meat', 'rub', 'tube', 'famous', 'dollar', 'stream', 'fear', 'sight', 'thin', 'triangle', 'planet', 
        'hurry', 'chief', 'colony', 'clock', 'mine', 'tie', 'enter', 'major', 'fresh', 'search', 'send', 'yellow', 
        'gun', 'allow', 'print', 'dead', 'spot', 'desert', 'suit', 'current', 'lift', 'rose', 'continue', 'block', 
        'chart', 'hat', 'sell', 'success', 'company', 'subtract', 'event', 'particular', 'deal', 'swim', 'term', 
        'opposite', 'wife', 'shoe', 'shoulder', 'spread', 'arrange', 'camp', 'invent', 'cotton', 'born', 'determine', 
        'quart', 'nine', 'truck', 'noise', 'level', 'chance', 'gather', 'shop', 'stretch', 'throw', 'shine', 
        'property', 'column', 'molecule', 'select', 'wrong', 'gray', 'repeat', 'require', 'broad', 'prepare', 
        'salt', 'nose', 'plural', 'anger', 'claim', 'continent', 'oxygen', 'sugar', 'death', 'pretty', 'skill', 
        'women', 'season', 'solution', 'magnet', 'silver', 'thank', 'branch', 'match', 'suffix', 'especially', 
        'fig', 'afraid', 'huge', 'sister', 'steel', 'discuss', 'forward', 'similar', 'guide', 'experience', 
        'score', 'apple', 'bought', 'led', 'pitch', 'coat', 'mass', 'card', 'band', 'rope', 'slip', 'win', 
        'dream', 'evening', 'condition', 'feed', 'tool', 'total', 'basic', 'smell', 'valley', 'nor', 'double', 
        'seat', 'arrive', 'master', 'track', 'parent', 'shore', 'division', 'sheet', 'substance', 'favor', 
        'connect', 'post', 'spend', 'chord', 'fat', 'glad', 'original', 'share', 'station', 'dad', 'bread', 
        'charge', 'proper', 'bar', 'offer', 'segment', 'slave', 'duck', 'instant', 'market', 'degree', 'populate', 
        'chick', 'dear', 'enemy', 'reply', 'drink', 'occur', 'support', 'speech', 'nature', 'range', 'steam', 
        'motion', 'path', 'liquid', 'log', 'meant', 'quotient', 'teeth', 'shell', 'neck'
    }
    
    # Add meaningful words from JD (filter out stop words and short words)
    for word in words:
        if (len(word) >= 3 and  # At least 3 characters
            word not in stop_words and  # Not a stop word
            not word.isdigit() and  # Not just numbers
            word not in jd_keywords):  # Not already added
            jd_keywords.append(word)
    
    # Also extract capitalized technical terms (like React.js, Node.js, etc.)
    capitalized_terms = re.findall(r'\b[A-Z][a-zA-Z0-9.#+\-()]+\b', jd)
    for term in capitalized_terms:
        term_lower = term.lower()
        if term_lower not in jd_keywords and len(term) > 2:
            jd_keywords.append(term_lower)
    
    # Remove duplicates
    jd_keywords = list(set(jd_keywords))
    
    print(f"JD keywords (first 20): {jd_keywords[:20]}")
    print(f"Total JD keywords: {len(jd_keywords)}")
    
    # If no keywords found in JD, return base score
    if not jd_keywords:
        print("No keywords found in JD, returning base score")
        return 50.0
    
    # Count matches between resume and JD
    matches = 0
    matched_terms = []
    
    # Check resume keywords against JD keywords
    for keyword in resume_keywords:
        for jd_keyword in jd_keywords:
            if keyword == jd_keyword or keyword in jd_keyword or jd_keyword in keyword:
                matches += 1
                matched_terms.append(f"{keyword} -> {jd_keyword}")
                print(f"Match: '{keyword}' matches '{jd_keyword}'")
                break
    
    # Check resume skills against JD keywords
    for skill in resume_skills:
        for jd_keyword in jd_keywords:
            if skill == jd_keyword or skill in jd_keyword or jd_keyword in skill:
                matches += 1
                matched_terms.append(f"{skill} -> {jd_keyword}")
                print(f"Match: '{skill}' matches '{jd_keyword}'")
                break
    
    # Calculate score based on match percentage
    total_possible_matches = len(jd_keywords)
    match_percentage = (matches / total_possible_matches) * 100
    
    # Apply some bonuses for having good data
    bonus = 0
    
    # Bonus for having many keywords (up to 10 points)
    if len(resume_keywords) >= 8:
        bonus += 10
    elif len(resume_keywords) >= 5:
        bonus += 5
    elif len(resume_keywords) >= 3:
        bonus += 2
    
    # Bonus for having experience (up to 5 points)
    if experience and len(experience) > 0:
        bonus += min(len(experience), 5)
    
    # Bonus for having education (up to 5 points)
    if education and len(education) > 0:
        bonus += min(len(education), 5)
    
    # Calculate final score
    final_score = min(match_percentage + bonus, 100.0)
    
    print(f"Matches: {matches}/{total_possible_matches} ({match_percentage:.1f}%)")
    print(f"Bonus: {bonus}")
    print(f"Final score: {final_score:.1f}")
    
    return round(final_score, 1) 