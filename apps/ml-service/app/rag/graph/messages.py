"""
app/rag/graph/messages.py
-------------------------
Localized canned replies (en / hi / mr) used when the graph blocks a message or an LLM
call fails. Copied from the legacy pipeline so pipeline.py can be deleted later.
"""

BLOCKED_REPLIES = {
    "en": {
        "empty_input": "Looks like that message came through empty -- could you try again?",
        "input_too_long": "That's a bit long for me to work with -- could you shorten it?",
        "jailbreak_pattern": "I can't follow instructions like that, but I'm happy to help with PCOD/PCOS questions.",
        "toxic_content": "Let's keep this a respectful space -- happy to help with PCOD/PCOS questions whenever you're ready.",
        "default": "I can't help with that message.",
    },
    "hi": {
        "empty_input": "लगता है वह मैसेज खाली आया — क्या आप दोबारा कोशिश कर सकती हैं?",
        "input_too_long": "यह मेरे लिए थोड़ा लंबा है — क्या आप इसे छोटा कर सकती हैं?",
        "jailbreak_pattern": "मैं ऐसे निर्देशों का पालन नहीं कर सकता, लेकिन PCOD/PCOS से जुड़े सवालों में आपकी मदद करके खुशी होगी।",
        "toxic_content": "चलिए इसे एक सम्मानजनक जगह बनाए रखें — जब भी आप तैयार हों, PCOD/PCOS से जुड़े सवालों में मदद करने में खुशी होगी।",
        "default": "मैं इस मैसेज में मदद नहीं कर सकता।",
    },
    "mr": {
        "empty_input": "वाटतंय की तो मेसेज रिकामा आला — तुम्ही पुन्हा प्रयत्न करू शकता का?",
        "input_too_long": "हे माझ्यासाठी थोडे मोठे आहे — तुम्ही ते थोडे लहान करू शकता का?",
        "jailbreak_pattern": "मी अशा सूचनांचे पालन करू शकत नाही, पण PCOD/PCOS शी संबंधित प्रश्नांमध्ये मदत करण्यात मला आनंद आहे.",
        "toxic_content": "चला ही एक आदरयुक्त जागा ठेवूया — तुम्ही तयार असाल तेव्हा, PCOD/PCOS शी संबंधित प्रश्नांमध्ये मदत करण्यात आनंद आहे.",
        "default": "मी या मेसेजमध्ये मदत करू शकत नाही.",
    },
}

SMALL_TALK_FALLBACK = {
    "en": "Hey! How can I help today?",
    "hi": "नमस्ते! आज मैं आपकी कैसे मदद कर सकता हूं?",
    "mr": "नमस्कार! आज मी तुम्हाला कशी मदत करू शकतो?",
}

OUT_OF_SCOPE_FALLBACK = {
    "en": "I can only help with PCOD/PCOS and this app's features -- happy to help with those!",
    "hi": "मैं केवल PCOD/PCOS और इस ऐप की सुविधाओं में मदद कर सकता हूं — उनमें मदद करने में खुशी होगी!",
    "mr": "मी फक्त PCOD/PCOS आणि या ॲपच्या वैशिष्ट्यांमध्ये मदत करू शकतो — त्यामध्ये मदत करण्यात आनंद आहे!",
}

GROUNDED_FAILED_FALLBACK = {
    "en": "I wasn't able to put together a good answer for that -- could you try rephrasing?",
    "hi": "मैं इसके लिए एक अच्छा जवाब नहीं बना पाया — क्या आप इसे दूसरे तरीके से पूछ सकती हैं?",
    "mr": "मला यासाठी चांगले उत्तर तयार करता आले नाही — तुम्ही ते वेगळ्या पद्धतीने विचारू शकता का?",
}


# ---- safety replies (R5). Helpline numbers: verify they are still current before each release. ----
SELF_HARM_REPLY = {
    "en": ("I'm really sorry you're going through this -- you matter, and you don't have to carry it alone. "
           "Please talk to someone right now: call Tele-MANAS at 14416 (free, 24x7, in many languages), or if you "
           "are in immediate danger call 112. If someone you trust is nearby, please tell them how you feel. "
           "I'm happy to keep chatting, but a real person can support you best right now."),
    "hi": ("मुझे बहुत दुख है कि आप इस दौर से गुज़र रही हैं — आप मायने रखती हैं, और आपको यह अकेले नहीं सहना है। "
           "कृपया अभी किसी से बात करें: Tele-MANAS (14416) पर कॉल करें — यह मुफ़्त है, 24 घंटे चालू रहता है और कई भाषाओं में मदद मिलती है। "
           "अगर आप तुरंत खतरे में हैं तो 112 पर कॉल करें। किसी भरोसेमंद व्यक्ति को अपने मन की बात ज़रूर बताएं।"),
    "mr": ("तुम्ही ज्या त्रासातून जात आहात त्याबद्दल मला खूप वाईट वाटतंय — तुम्ही महत्त्वाच्या आहात, आणि हे तुम्हाला एकटीने सहन करायचं नाही. "
           "कृपया आत्ता कोणाशी तरी बोला: Tele-MANAS (14416) वर कॉल करा — हे मोफत आहे, २४ तास चालू असतं आणि अनेक भाषांमध्ये मदत मिळते. "
           "तुम्ही तात्काळ धोक्यात असाल तर 112 वर कॉल करा. तुमच्या विश्वासातील एखाद्या व्यक्तीला तुमच्या मनातलं नक्की सांगा."),
}

EMERGENCY_REPLY = {
    "en": ("What you're describing could be serious and shouldn't wait. Please get urgent medical care right now: "
           "go to the nearest hospital emergency department or call 112. If you can, ask someone to go with you. "
           "I can't assess this over chat, and I don't want you to lose any time."),
    "hi": ("आप जो बता रही हैं वह गंभीर हो सकता है और इसे टालना ठीक नहीं है। कृपया अभी तुरंत नज़दीकी अस्पताल के इमरजेंसी विभाग में जाएं "
           "या 112 पर कॉल करें। हो सके तो किसी को अपने साथ ले जाएं। मैं चैट पर इसकी जाँच नहीं कर सकता, और मैं नहीं चाहता कि आपका ज़रा भी समय बर्बाद हो।"),
    "mr": ("तुम्ही जे सांगत आहात ते गंभीर असू शकतं आणि त्याला उशीर करू नये. कृपया आत्ताच जवळच्या रुग्णालयाच्या इमर्जन्सी विभागात जा "
           "किंवा 112 वर कॉल करा. शक्य असल्यास कोणालातरी सोबत घ्या. मी चॅटवर याची तपासणी करू शकत नाही, आणि तुमचा थोडाही वेळ वाया जावा असं मला वाटत नाही."),
}

RAILS_FALLBACK = {
    "en": ("I don't want to give you specific doses, numbers or conclusions that I can't back up from my sources -- "
           "please check this with your doctor or pharmacist. I'm happy to share the general information I do have."),
    "hi": ("मैं ऐसी खुराक, संख्याएँ या निष्कर्ष नहीं बताना चाहता जिन्हें मैं अपने स्रोतों से पक्का न कर सकूँ — कृपया यह अपने डॉक्टर या फार्मासिस्ट से पूछ लें। "
           "सामान्य जानकारी में मैं ज़रूर मदद कर सकता हूँ।"),
    "mr": ("मला माझ्या स्रोतांवरून खात्री करता येणार नाही अशा मात्रा, आकडे किंवा निष्कर्ष मी सांगू इच्छित नाही — कृपया हे तुमच्या डॉक्टरांना किंवा फार्मासिस्टला विचारा. "
           "सर्वसाधारण माहितीमध्ये मी नक्की मदत करू शकतो."),
}


def pick(table: dict, language: str, key: str | None = None) -> str:
    lang_table = table.get(language, table["en"])
    if key is not None:
        return lang_table.get(key, table["en"].get(key, table["en"]["default"]))
    return lang_table

