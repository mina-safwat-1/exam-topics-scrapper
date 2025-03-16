from selenium import webdriver
from selenium.webdriver.chrome.options import Options
import time
import re



from bs4 import BeautifulSoup

base_request_url = "https://www.examtopics.com"

def get_links_of_questions(exam_vendor="", exam_name=""):
    """
    Opens a website in Chrome WebDriver and keeps it open for the specified duration
    
    Args:
        url (str): URL of the website to open
        duration_seconds (int): How long to keep the browser open in seconds
    """
    # Set up Chrome options (uncomment headless mode if you don't want to see the browser)
    chrome_options = Options()
    # chrome_options.add_argument("--headless")  # Comment this out to see the browser
    
    # Initialize the Chrome driver
    driver = webdriver.Chrome(options=chrome_options)
    
    try:
        # Navigate to the URL        
        url = base_request_url + "/discussions/" + exam_vendor
        
        print(f"Opening {url}...")
        driver.get(url)
        print(f"Page title: {driver.title}")
        
        # # Keep the browser open for the specified duration
        # print(f"Keeping the browser open for {duration_seconds} seconds...")
        time.sleep(10)
        # print("Time's up! Closing the browser.")
        
        
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
            for i in range(1, num_pages + 1):
                url = base_request_url + "/discussions/" + exam_vendor + "/{}/".format(i)
                driver.get(url)
                time.sleep(5)
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

# Example usage
if __name__ == "__main__":
    # open_website_for_duration(exam_vendor="hashicorp" , exam_name="Exam Terraform Associate topic 1")
    sort_questions("./questions")