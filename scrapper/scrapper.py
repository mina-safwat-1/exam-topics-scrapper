from selenium import webdriver
from selenium.webdriver.chrome.options import Options
import re

from tqdm import tqdm  # Add this import at the top
import argparse

from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.by import By

import json

from bs4 import BeautifulSoup

import os


base_request_url = "https://www.examtopics.com"


# Set up the Chrome options (headless mode)
chrome_options = Options()
chrome_options.add_argument("--headless=new")  # New headless mode in Chrome 109+
chrome_options.add_argument("--disable-gpu")    # GPU hardware acceleration isn't needed
chrome_options.add_argument("--window-size=1920,1080")  # Set window size for consistent rendering

# Initialize the driver
driver = webdriver.Chrome(options=chrome_options)

# print(driver.capabilities["browserVersion"])

def get_links_of_questions(exam_vendor="", exam_name=""):
    try:
        # Navigate to the URL        
        url = base_request_url + "/discussions/" + exam_vendor
        
        print(f"Opening {url}...")
        driver.get(url)
        print(f"Page title: {driver.title}")

        # Wait for either page selector or discussion links to load (for single-page scenarios)
        try:
            WebDriverWait(driver, 15).until(
                EC.any_of(
                    EC.presence_of_element_located((By.CLASS_NAME, "discussion-list-page-select")),
                    EC.presence_of_element_located((By.CLASS_NAME, "discussion-link"))
                )
            )
        except:
            print("Timeout waiting for initial page elements")
            return
        
        # create a file to store the links
        with open("questions", "w") as f:
            pass
        
        html_content = driver.page_source
        soup = BeautifulSoup(html_content, "html.parser")
        
        # Get the number of pages
        num_pages = 1
        pages = soup.find_all(attrs={"class": "discussion-list-page-select form-control form-control-sm"})
        for page in pages:
            options = page.find_all('option')
            for option in options:
                if option.get_text(strip=True).isnumeric():
                    num_pages = max(num_pages, int(option.get_text(strip=True)))


        with open("questions", "a") as file:
            for i in tqdm(range(1, num_pages + 1),
                        desc="Processing pages", 
                        unit="page"):                
                url = base_request_url + "/discussions/" + exam_vendor + "/{}/".format(i)
                driver.get(url)
                
                
                # Wait for discussion links to load
                try:
                    WebDriverWait(driver, 15).until(
                        EC.presence_of_element_located((By.CLASS_NAME, "discussion-link"))
                    )
                except:
                    print(f"Timeout waiting for links on page {i}")
                    continue        
                
                # time.sleep(5)

                html_content = driver.page_source
                soup = BeautifulSoup(html_content, "html.parser")
                links = soup.find_all(attrs={"class": "discussion-link"})
                for link in links:
                    question_name = link.get_text(strip=True)
                    if question_name.startswith(exam_name):
                        file.write(base_request_url + link.get('href') + "\n")
                        
    except Exception as e:
        print(f"An error occurred: {e}")
        
    finally:
        # Close the browser
        driver.quit()
        print("Browser closed.")


def sort_questions(file_path):
    questions = {}
    pattern = r"question-(\d+)-discussion"
    with open(file_path, "r") as file:
        lines = file.readlines()
        for url in lines:
            match = re.search(pattern, url)
            if match:
                question_number = int(match.group(1))
                questions[question_number] = url
    urls = []
    for key in sorted(questions.keys()):
        urls.append(questions[key])
    
    with open("ordered_questions", "w") as file:
        for url in urls:
            file.write(url)
        
        
    with open(file_path, "w") as file:
        file.writelines(lines)


def get_question(path):
    
    questions = []
    
    with open(path, "r") as file:
        urls = file.readlines()
        for url in tqdm(urls, desc="Processing URLs", unit="url"):            
            try:
                
                driver.get(url)
                wait = WebDriverWait(driver, 10)
                reveal_button = wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "a.btn.btn-primary.reveal-solution")))
                # Click the button
                reveal_button.click()
                html_content = driver.page_source
                                            
                # In this case, we'll use the provided HTML content
                question_data = extract_question_data(html_content)
                
                questions.append(question_data)
            except Exception as e:
                print(f"An error occurred while processing {url}")
                continue

            
        json_output = json.dumps(questions, indent=2)
        # Save to a file
        with open('questions.json', 'w') as f:
            f.write(json_output)
    
    driver.quit()

            


def extract_question_data(html_content):
    soup = BeautifulSoup(html_content, 'html.parser')
    
    # Extract question number and topic
    question_div = soup.find('div', class_='question-discussion-header')
    question_info = question_div.find('div').text.strip().split('\n')
    question_number = int(re.search(r'Question #: (\d+)', question_info[0]).group(1))
    topic_number = int(re.search(r'Topic #: (\d+)', question_info[1]).group(1))
    
    # Extract question text with images
    question_body = soup.find('div', class_='question-body')
    question_p = question_body.find('p', class_='card-text')
    
    # Handle question text with possible images
    question_text = question_p.text.strip()
    
    # Extract image URLs if present
    images = []
    for img in question_p.find_all('img'):
        image_url = img.get('src')
        if image_url:
            images.append("https://www.examtopics.com" + image_url)
    
    # Extract choices
    choices = []
    choice_items = soup.find_all('li', class_='multi-choice-item')
    
    # Extract vote data and correct answer
    vote_script = soup.find('script', id=re.compile(r'\d+'))
    vote_data = {}
    if vote_script:
        vote_json = json.loads(vote_script.string)
        for item in vote_json:
            vote_data[item['voted_answers']] = {
                'votes': item['vote_count'],
                'is_most_voted': item['is_most_voted']
            }
    
    # Extract correct answer(s)
    correct_answer_span = soup.find('span', class_='correct-answer')
    correct_answers = []
    if correct_answer_span:
        correct_answers = list(correct_answer_span.text.strip())
    
    for choice in choice_items:
        letter_span = choice.find('span', class_='multi-choice-letter')
        letter = letter_span.get('data-choice-letter')
        
        # Create a copy of the element to work with
        choice_copy = BeautifulSoup(str(choice), 'html.parser')
        
        # Remove the letter span
        choice_copy.find('span', class_='multi-choice-letter').extract()
        
        # Remove the "Most Voted" badge if it exists
        most_voted_badge = choice_copy.find('span', class_='most-voted-answer-badge')
        if most_voted_badge:
            most_voted_badge.extract()
        
        # Get the cleaned text
        text = choice_copy.get_text().strip()
        
        choice_data = {
            "letter": letter,
            "text": text,
            "votes": vote_data.get(letter, {}).get('votes', 0)
        }
        
        # Check if this is the correct answer
        if 'correct-choice' in choice.get('class', []) or letter in correct_answers:
            choice_data["correct"] = True
        
        # Check if most voted
        if vote_data.get(letter, {}).get('is_most_voted', False):
            choice_data["mostVoted"] = True
        
        choices.append(choice_data)
    
    # Create the final JSON structure
    question_data = {
        "number": question_number,
        "topic": topic_number,
        "text": question_text,
        "choices": choices,
        "isMultiAnswer": len(correct_answers) > 1,
        "correctAnswers": correct_answers
    }
    
    # Add images if present
    if images:
        question_data["images"] = images
    
    return question_data
    


# Example usage
if __name__ == "__main__":
    
    # example 
    # python scrapper.py --vendor "amazon" --name "Exam AWS Certified Cloud Practitioner CLF-C02 topic 1"
    
    # Set up argument parser
    parser = argparse.ArgumentParser(description='Scrape exam questions from vendor website')
    
    # example vendor="amazon"
    parser.add_argument('--vendor', '-v', required=True, help='Exam vendor name')
    # example exam_name="Exam AWS Certified Cloud Practitioner CLF-C02 topic 1"
    parser.add_argument('--name', '-n', required=True, help='Exam name prefix')
    
    # Parse arguments
    args = parser.parse_args()
    
    # Call your function with the arguments
    get_links_of_questions(exam_vendor=args.vendor, exam_name=args.name)
        
    # sort_questions("./questions")
    get_question("questions")