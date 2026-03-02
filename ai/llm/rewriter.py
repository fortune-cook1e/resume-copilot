import torch
from transformers import AutoModelForCausalLM, AutoTokenizer


class ResumeRewriter:
    def __init__(self, model_name="google/gemma-2b-it"):

        print("Loading LLM...")

        self.tokenizer = AutoTokenizer.from_pretrained(model_name)

        self.model = AutoModelForCausalLM.from_pretrained(
            model_name, dtype=torch.float16, device_map="auto"
        )

    def rewrite(self, resume_text, job_text):

        prompt = f"""
You are a professional resume optimizer.

Rewrite the resume content to better match the job description.

Resume:
{resume_text}

Job Description:
{job_text}

Provide an improved version of the resume section.
"""

        inputs = self.tokenizer(prompt, return_tensors="pt").to(self.model.device)

        with torch.no_grad():
            outputs = self.model.generate(
                **inputs,
                max_new_tokens=300,
                temperature=0.7,
                top_p=0.9,
            )

        # remove the prompt part from the generated output
        generated_tokens = outputs[0][inputs["input_ids"].shape[-1] :]
        response = self.tokenizer.decode(generated_tokens, skip_special_tokens=True)

        print("\n=== LLM Response ===\n")
        print(response)

        return response
