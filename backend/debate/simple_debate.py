"""
Simple AI Debate System
Clean, minimal implementation focusing on argument generation and Vapi voice integration
"""

import asyncio
import random
import os
import sys
from typing import Dict, Any, List
from dotenv import load_dotenv

# Load environment
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(backend_dir, '.env'))
sys.path.append(backend_dir)

from common import LLMClient

class SimpleDebate:
    """Minimal debate system - just argument generation and state"""
    
    def __init__(self, topic: str, model1: str, model2: str, judge_model: str = "gpt-4o"):
        self.topic = topic
        self.model1 = model1  # Pro side
        self.model2 = model2  # Con side
        self.judge_model = judge_model  # Judge
        
        # Simple state
        self.arguments = []  # List of all arguments
        self.current_turn = 1  # Whose turn (1 or 2)
        self.round_count = 0
        self.max_rounds = 6
        self.is_finished = False
        self.judgment = None
        
        print(f"🎭 New debate: {topic}")
        print(f"📍 PRO: {model1} | CON: {model2} | JUDGE: {judge_model}")
    
    async def generate_argument(self) -> Dict[str, Any]:
        """Generate next argument from current player"""
        if self.round_count >= self.max_rounds:
            return {"error": "Debate finished"}
        
        # Determine current player
        current_model = self.model1 if self.current_turn == 1 else self.model2
        position = "PRO" if self.current_turn == 1 else "CON"
        
        # Build simple prompt
        prompt = self._build_prompt(position)
        
        try:
            # Map model names to LLM types
            model_mapping = {
                "gpt-4o-mini": "OPENAI",
                "gpt-4o": "OPENAI",
                "claude-3-5-sonnet-20241022": "ANTHROPIC", 
                "gemini-1.5-flash": "GEMINI"
            }
            
            llm_type = model_mapping.get(current_model, "OPENAI")  # Default to OpenAI
            print(f"🤖 Using {llm_type} for {current_model}")
            
            # Get LLM response
            llm = LLMClient(llm_type)
            response = await llm.get_response(prompt)
            
            # Handle fallback response 
            if "apologize" in response and "error" in response:
                raise Exception(f"API call failed for {current_model}")
            
            # Clean up response (don't truncate - let full arguments through)
            argument = response.strip()
            # Remove any truncation - we want full arguments
            
            # Store argument
            arg_data = {
                "round": self.round_count + 1,
                "player": self.current_turn,
                "model": current_model,
                "position": position,
                "argument": argument,
                "topic": self.topic
            }
            
            self.arguments.append(arg_data)
            self.round_count += 1
            self.current_turn = 2 if self.current_turn == 1 else 1  # Switch turns
            
            print(f"✅ Generated argument {self.round_count}: {current_model} ({position})")
            
            # Check if debate is finished
            debate_finished = self.round_count >= self.max_rounds
            if debate_finished:
                self.is_finished = True
            
            return {
                "success": True,
                "argument": arg_data,
                "debate_finished": debate_finished,
                "next_player": self.current_turn if not debate_finished else None
            }
            
        except Exception as e:
            error_msg = str(e)
            print(f"❌ Error generating argument: {error_msg}")
            
            # More helpful error messages
            if "api" in error_msg.lower() and "key" in error_msg.lower():
                return {"error": f"Missing API key for {current_model}. Please add API keys to backend/.env file."}
            elif "unknown model type" in error_msg.lower():
                return {"error": f"Model {current_model} not supported. Try: gpt-4o-mini, claude-3-5-sonnet-20241022"}
            else:
                return {"error": f"Failed to generate argument: {error_msg}"}
    
    def _build_prompt(self, position: str) -> str:
        """Build simple debate prompt"""
        
        # Get context from previous arguments
        context = ""
        if self.arguments:
            last_few = self.arguments[-2:]  # Last 2 arguments for context
            context = "\n".join([f"{arg['position']}: {arg['argument']}" for arg in last_few])
            context = f"\nPrevious arguments:\n{context}\n"
        
        prompt = f"""You are debating the topic: "{self.topic}"

Your position: You are arguing {position} ({"in favor of" if position == "PRO" else "against"}) this topic.
{context}
Instructions:
- Give a strong, persuasive argument for your position
- Keep it under 50 words
- Be direct and compelling
- If responding to opponent, address their points

Your argument:"""
        
        return prompt
    
    async def judge_debate(self) -> Dict[str, Any]:
        """Judge the entire debate based on comprehensive rubric"""
        if not self.is_finished:
            return {"error": "Debate not finished yet"}
        
        if self.judgment:
            return self.judgment  # Already judged
        
        try:
            # Map model names to LLM types
            model_mapping = {
                "gpt-4o-mini": "OPENAI",
                "gpt-4o": "OPENAI",
                "claude-3-5-sonnet-20241022": "ANTHROPIC", 
                "gemini-1.5-flash": "GEMINI"
            }
            
            judge_llm_type = model_mapping.get(self.judge_model, "OPENAI")
            print(f"⚖️ Using {judge_llm_type} judge for {self.judge_model}")
            
            # Prepare debate transcript
            pro_arguments = [arg for arg in self.arguments if arg['position'] == 'PRO']
            con_arguments = [arg for arg in self.arguments if arg['position'] == 'CON']
            
            transcript = f"DEBATE TOPIC: {self.topic}\n\n"
            
            # Interleave arguments chronologically
            for i in range(max(len(pro_arguments), len(con_arguments))):
                if i < len(pro_arguments):
                    transcript += f"PRO ARGUMENT {i+1}: {pro_arguments[i]['argument']}\n\n"
                if i < len(con_arguments):
                    transcript += f"CON ARGUMENT {i+1}: {con_arguments[i]['argument']}\n\n"
            
            # Create comprehensive judging prompt
            judge_prompt = f"""You are an expert debate judge evaluating this formal debate. Please score each side based on this precise rubric:

DEBATE TRANSCRIPT:
{transcript}

SCORING RUBRIC (Total: 100 points):

1. ARGUMENTATIVE STRUCTURE & LOGICAL SOUNDNESS (30 points):
   a. Claim-Premise-Conclusion Format (10 pts): +2 per clear argument structure, -1 for missing elements
   b. Deductive/Inductive Validity (10 pts): +2 per logically valid argument, 0 for fallacies
   c. Consistency Across Arguments (5 pts): +5 if no contradictions, -2 per contradiction  
   d. No Logical Fallacies (5 pts): +5 if clean, -1 per fallacy (false dilemma, strawman, etc.)

2. DEPTH OF JUSTIFICATION & INSIGHT (20 points):
   a. Causal Chains/Mechanisms (8 pts): +2 per clear explanation of how X causes Y
   b. Assumption Surfacing (6 pts): +1 per identified assumption, +2 if defended/refuted
   c. Nuanced Thinking (6 pts): +6 for showing trade-offs, limitations, conditionality

3. REBUTTAL EFFECTIVENESS (30 points):
   a. Direct Engagement (10 pts): +2 per directly addressed opposing argument
   b. Counter-Explanation Strength (10 pts): +1-3 per counterargument quality
   c. Argument Prioritization (5 pts): +5 for attacking strongest points, -2 for only weak points
   d. Strategic Concession (5 pts): +5 for strategic concessions or synthesis

4. TOPICAL RELEVANCE & RESOLUTION FOCUS (20 points):
   a. Resolution Alignment (5 pts): +5 if arguments resolve core question, -1 for tangents
   b. Definition/Framing (5 pts): +5 for clear definitions applied consistently
   c. Complete Scope Coverage (5 pts): +5 for addressing all dimensions, -1 per missed dimension
   d. Avoidance of Redundancy (5 pts): +5 if no repetition, -2 per repeated idea

INSTRUCTIONS:
1. Score each category for PRO and CON separately
2. Provide specific examples from their arguments
3. Explain your reasoning for each score
4. Declare the winner and margin of victory

Format your response as JSON:
{{
  "pro_scores": {{
    "structure": {{"score": X, "reasoning": "..."}},
    "depth": {{"score": X, "reasoning": "..."}},
    "rebuttal": {{"score": X, "reasoning": "..."}},
    "relevance": {{"score": X, "reasoning": "..."}}
  }},
  "con_scores": {{
    "structure": {{"score": X, "reasoning": "..."}},
    "depth": {{"score": X, "reasoning": "..."}},
    "rebuttal": {{"score": X, "reasoning": "..."}},
    "relevance": {{"score": X, "reasoning": "..."}}
  }},
  "winner": "PRO|CON|TIE",
  "margin": "X points",
  "overall_analysis": "Comprehensive analysis of the debate quality and outcome..."
}}"""

            # Get judgment from LLM
            judge = LLMClient(judge_llm_type)
            response = await judge.get_response(judge_prompt)
            
            # Parse JSON response
            import json
            try:
                # Clean response and extract JSON
                response_text = response.strip()
                
                # Try to find JSON in the response if it's wrapped in text
                if '{' in response_text and '}' in response_text:
                    start_idx = response_text.find('{')
                    end_idx = response_text.rfind('}') + 1
                    json_text = response_text[start_idx:end_idx]
                else:
                    json_text = response_text
                
                print(f"🔍 Parsing judge response (length: {len(json_text)} chars)")
                judgment_data = json.loads(json_text)
                
                # Calculate totals
                pro_total = sum(judgment_data['pro_scores'][cat]['score'] for cat in judgment_data['pro_scores'])
                con_total = sum(judgment_data['con_scores'][cat]['score'] for cat in judgment_data['con_scores'])
                
                judgment_data['pro_total'] = pro_total
                judgment_data['con_total'] = con_total
                judgment_data['topic'] = self.topic
                judgment_data['model1'] = self.model1
                judgment_data['model2'] = self.model2
                judgment_data['judge_model'] = self.judge_model
                
                self.judgment = judgment_data
                print(f"⚖️ Judgment complete: {judgment_data['winner']} wins by {judgment_data['margin']}")
                
                return {
                    "success": True,
                    "judgment": judgment_data
                }
                
            except json.JSONDecodeError as e:
                print(f"❌ Failed to parse judgment JSON: {e}")
                print(f"Raw response: {response[:500]}...")  # Show first 500 chars
                return {"error": f"Failed to parse judgment JSON: {str(e)}"}
                
        except Exception as e:
            error_msg = str(e)
            print(f"❌ Error judging debate: {error_msg}")
            return {"error": f"Failed to judge debate: {error_msg}"}
    
    def get_state(self) -> Dict[str, Any]:
        """Get current debate state"""
        return {
            "topic": self.topic,
            "model1": self.model1,
            "model2": self.model2,
            "arguments": self.arguments,
            "current_turn": self.current_turn,
            "round_count": self.round_count,
            "max_rounds": self.max_rounds,
            "finished": self.round_count >= self.max_rounds
        }

# Global storage for active debates
active_debates: Dict[str, SimpleDebate] = {} 