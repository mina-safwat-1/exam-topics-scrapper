document.addEventListener('DOMContentLoaded', function() {
    // Variables
    const revealBtn = document.getElementById('revealBtn');
    const hideBtn = document.getElementById('hideBtn');
    const answerContainer = document.querySelector('.answer-container');
    const choiceItems = document.querySelectorAll('.choice-item');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const progressBar = document.getElementById('progressBar');
    const currentQuestionSpan = document.getElementById('currentQuestion');
    const totalQuestionsSpan = document.getElementById('totalQuestions');
    
    // Question data - you'll expand this as you add more questions
    const questions = [
        {
            id: "817736",
            number: 20,
            topic: 1,
            text: "One remote backend configuration always maps to a single remote workspace.",
            choices: [
                { letter: "A", text: "True", votes: 9 },
                { letter: "B", text: "False", votes: 62, correct: true, mostVoted: true }
            ]
        }
        // Add more questions here as you build your collection
    ];
    
    // Set initial question count
    let currentQuestionIndex = 0;
    totalQuestionsSpan.textContent = questions.length;
    updateProgressBar();
    
    // Toggle answer visibility
    revealBtn.addEventListener('click', function() {
        answerContainer.style.display = 'block';
        revealBtn.style.display = 'none';
        hideBtn.style.display = 'inline-block';
        
        // Highlight the correct answer
        choiceItems.forEach(item => {
            const choiceLetter = item.getAttribute('data-choice');
            if (choiceLetter === 'B') { // Hardcoded for first question, will be dynamic later
                item.classList.add('correct');
            }
        });
    });
    
    hideBtn.addEventListener('click', function() {
        answerContainer.style.display = 'none';
        hideBtn.style.display = 'none';
        revealBtn.style.display = 'inline-block';
        
        // Remove highlight from the correct answer
        choiceItems.forEach(item => {
            item.classList.remove('correct');
        });
    });
    
    // Choice selection
    choiceItems.forEach(item => {
        item.addEventListener('click', function() {
            // First remove selected from all
            choiceItems.forEach(choice => choice.classList.remove('selected'));
            
            // Add selected class
            this.classList.add('selected');
            
            // Automatically show the answer after selection
            if (answerContainer.style.display === 'none' || !answerContainer.style.display) {
                revealBtn.click();
            }
        });
    });
    
    // Navigation between questions
    prevBtn.addEventListener('click', function() {
        if (currentQuestionIndex > 0) {
            currentQuestionIndex--;
            loadQuestion(currentQuestionIndex);
        }
    });
    
    nextBtn.addEventListener('click', function() {
        if (currentQuestionIndex < questions.length - 1) {
            currentQuestionIndex++;
            loadQuestion(currentQuestionIndex);
        }
    });
    
    // Update progress bar
    function updateProgressBar() {
        const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
        progressBar.style.width = `${progress}%`;
        currentQuestionSpan.textContent = currentQuestionIndex + 1;
        
        // Disable/enable navigation buttons
        prevBtn.disabled = currentQuestionIndex === 0;