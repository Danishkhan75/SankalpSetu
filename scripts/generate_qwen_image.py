import os
from huggingface_hub import InferenceClient

# 1. Apna Hugging Face API Token yahan dalein (Jo apne abhi create kiya hai)
HF_TOKEN = os.environ.get("HF_TOKEN")
if not HF_TOKEN:
    raise RuntimeError("Set HF_TOKEN in the environment before running this script.")
# 2. Hugging Face Inference Client ko initialize karein
client = InferenceClient(api_key=HF_TOKEN)

# 3. Jo image aapko banwani hai, uska descriptive prompt likhein
prompt = os.environ.get(
    "HF_IMAGE_PROMPT",
    "A high-quality minimalist logo of a glowing blue owl, transparent background, vector style",
)

print("Qwen-Image-2.1 model se aapki image generate ho rahi hai...")

try:
    # 4. Text-to-Image function ko call karein (Model ID ke sath)
    image = client.text_to_image(
        prompt,
        model="Qwen/Qwen-Image-2.1"
    )

    # 5. Generated image ko save karein
    output_path = os.environ.get("HF_IMAGE_OUTPUT", "qwen_image_output.png")
    image.save(output_path)
    print(f"Mubarak ho! Image successfully '{output_path}' ke naam se aapke folder me save ho gayi hai.")

except Exception as e:
    print(f"\nOops! Ek error aaya hai: {e}")
    print("Tip: Agar 'Model is loading' ka error aaye, toh 1 minute baad code firse run karein, kyunki server ko start hone me thoda waqt lagta hai.")
