from src.agent import GeminiAgent

def test_steam_context():
    print("🧪 Testing Steammarketplace2 Context...")
    agent = GeminiAgent()
    
    # Ask a question that requires knowledge from the injected context
    question = "What is the tech stack of the Steammarketplace2 project?"
    print(f"\n❓ Question: {question}\n")
    
    agent.run(question)

if __name__ == "__main__":
    test_steam_context()
