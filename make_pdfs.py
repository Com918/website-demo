from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    PageTemplate,
    Paragraph,
    PageBreak,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parent
OUT = ROOT / "output" / "pdf"
OUT.mkdir(parents=True, exist_ok=True)

FONT_REGULAR = "/System/Library/Fonts/Supplemental/Arial Unicode.ttf"
FONT_BOLD = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
pdfmetrics.registerFont(TTFont("ArialUnicode", FONT_REGULAR))
pdfmetrics.registerFont(TTFont("ArialBold", FONT_BOLD))


ENGLISH = [
    ("00:00-00:31", "Lecturer", "They are a little closer to real CTAs, but they are too abstract and not specific enough. In general, I would say both of your directions have the same difficulty. This is okay because you are at Assignment One: nearly everybody has the same problem. The ideas are very general and not specific enough. You want to get much more specific and targeted about the theme and about your CTA - what you want the audience to do after they finish viewing your website."),
    ("00:31-01:20", "Lecturer", "That is general advice. We should try to improve this for Assignment One, but in Assignment One we are still exploring, so that is okay. Next week Assignment One is due, right? You are a little behind if you are still at the stage of choosing, so you have to change that situation quickly. The first step is to choose one of these two SDGs and then revise the CTA to be more specific. In both cases, you are on the way to developing the paragraph, but you cannot do it because your CTA is still either incorrect or too broad. You have to choose one of these."),
    ("01:20-02:08", "Lecturer", "My question for you is: of these two, which one are you really interested in? Which one feels important to you personally, or makes you think, 'Wow, this is really interesting'? I am not going to decide that for you. How many members are in your group?"),
    ("01:43-01:48", "Student", "Just the two of us."),
    ("01:48-02:15", "Lecturer", "I think the two of you have to decide which of these you really feel interested and passionate about, because it is going to be a difficult project and you need that personal interest to motivate you to do a good job, right?"),
    ("02:15-02:18", "Student", "Yes."),
    ("02:18-02:51", "Lecturer", "So, what is a good CTA? A good CTA will be targeted and realistic, and it will be something that I can do. Even if the main CTA is not something I can do immediately after viewing the website, the first step of that CTA should be something I can do immediately, within the day, or within the week. It should be very clear what I should do."),
    ("02:51-03:12", "Lecturer", "Let us take the second idea as an example. You have 'access to food' and 'access to...' First, these are not two separate aspects. The main aspect is food - more specifically, food that meets nutritional needs. But 'access' is not a CTA."),
    ("03:12-03:47", "Lecturer", "Underneath, you say, 'Recognize nutritious food as a human right.' That is in the form of a CTA because it is an order: 'Do it. Do this.' Unfortunately, it is not really something I can act on. What does it mean to recognize something? If I recognize nutritious food as a human right, what should I do? If I recognize the power of nutrition in unlocking human potential, what should I do?"),
    ("03:47-04:19", "Lecturer", "Instead of saying 'Recognize the power of nutrition,' you might say, 'Go through your refrigerator and throw out the junk food.' Or, 'Look in your cabinet, identify the gaps in your nutrition, go to the supermarket, and buy those nutritious foods.'"),
    ("04:19-05:45", "Lecturer", "Or you might say, 'Provide a vitamin to every school child every day.' At the start of the day, give every child a container of yogurt and a multivitamin to improve their nutrition. I am not suggesting this, but let us say you want to tell the government of Vietnam that every child needs a bowl of yogurt and a multivitamin at the start of every day. If that is the call to action - if that is what you want the government to do - then, as a user, what are you telling me that I should do? The plan is to provide yogurt and a vitamin to students every day, but I cannot do that. What do I have to do?"),
    ("05:45-06:28", "Lecturer", "You might want me to write a letter to my city council representative to urge them to consider this policy and push it to the national government. Maybe, in every city or neighborhood in Vietnam, there is some kind of representative of the Communist Party in each district. You could approach that representative and propose it, or find another avenue for presenting the idea. You might want to gather support, or say that more research is needed. You could tell RMIT, 'Please start a research project.' That could mean asking university researchers to study the ideal nutrition for schoolchildren in Vietnam, or focusing on the nutrition of elderly people and starting a program to help them. There are many possibilities. The problem is so big that we do not know what to do, so you need to make it very specific so that people do know what to do. Does that make sense?"),
    ("06:28-07:23", "Student", "Let us say my CTA is to use our artwork - to let viewers use the artwork on our website and post it on their social media as a demonstration or protest about hunger and people who are starving. Is that a good CTA?"),
    ("07:23-07:32", "Lecturer", "That would be okay if your website produces some interesting art that users can take and post on social media. Your CTA would be: 'Post this on your social media today to raise awareness.' That would be okay. You could do the same thing for the AIDS/HIV issue as well, right?"),
    ("07:32-07:34", "Student", "Yes."),
    ("07:34-08:19", "Lecturer", "Each of you could explore a different way. You have an interesting instinct in the idea on the screen: divide the CTA into two parts, with one person in your team taking Part A and the other taking Part B. Another way is to divide up the storytelling leading to the CTA: one person explains Point A and the other explains Point B, and both point to the same CTA. There are many ways to structure the work. What other questions do you have?"),
    ("08:19-08:51", "Student", "Actually, I have another SDG to target. We are thinking about architecture and ecology - using architecture combined with trees and plants - and our CTA is..."),
    ("08:51-09:26", "Lecturer", "Let me stop you there. Many groups in my class have already done that. Remember that one of your goals is to be creative and think of an outside idea that nobody has thought of. I am not saying the SDG is wrong - we have 17 SDGs, and everybody will have done one of them before. But your point is to come up with something creative and outstanding that other people have not thought of. What you are telling me right now is almost the lowest-hanging fruit that many people come up with in their first brainstorm. You want to go much deeper and come up with a much more creative idea."),
    ("09:26-09:40", "Lecturer and Student", "Lecturer: Did you have another question? Student: No, I think that is all. Yes, I think that is all."),
    ("09:40-10:48", "Lecturer", "After this meeting, you should quickly have a short chat and choose one of these directions. Then, today in class, you will work on developing the skill. You should immediately be thinking: how could I apply these experiments to make something creative? In Assignment One, you do not need to unify the work visually at all. You can come up with any kind of creative idea. The point is to be creative, interesting, and surprising - you are trying to surprise me. Over the next week, push those experiments as far as you can. If each of you can present an A experiment and a B experiment, that will be best. The idea is to look for a diversity of interesting, deep, and creative ideas."),
    ("10:48-11:19", "Lecturer", "The experiments only need to be generative. They do not have to include animation, and you do not need to think about interactivity. They need to be deep and creative. I will emphasize this one more time: within the day, you need to have your SDG, your specific goal, and your specific call to action as specific as possible. Narrow it down and make it very specific."),
    ("11:19-11:40", "Lecturer", "I think it is good that you had a consultation. I am glad we found this particular problem now. Your aim is to fix it within the day and get back on target for finishing Assignment One. See you in class later today."),
    ("11:40-11:52", "Student / Lecturer", "Students: Yes, thank you. Thank you. Bye. Lecturer: Bye. All right, bye. See you. Student: Thank you."),
]


VIETNAMESE = [
    ("00:00-00:31", "Giảng viên", "Các em đã tiến gần hơn một chút đến những CTA thực sự, nhưng chúng vẫn quá trừu tượng và chưa đủ cụ thể. Nhìn chung, thầy cho rằng cả hai hướng của các em đều gặp cùng một vấn đề. Điều này không sao vì các em đang ở Bài tập 1: gần như ai cũng gặp khó khăn này. Ý tưởng hiện còn quá chung chung và chưa đủ cụ thể. Các em cần xác định cụ thể và có trọng tâm hơn về chủ đề, cũng như về CTA - tức là muốn khán giả làm gì sau khi xem xong website của mình."),
    ("00:31-01:20", "Giảng viên", "Đó là lời khuyên chung. Chúng ta nên cố gắng cải thiện phần này cho Bài tập 1, nhưng ở Bài tập 1, chúng ta vẫn đang trong giai đoạn khám phá, nên như vậy cũng không sao. Tuần sau là đến hạn nộp Bài tập 1, đúng không? Nếu các em vẫn đang ở giai đoạn lựa chọn thì hơi chậm tiến độ, vì vậy phải nhanh chóng thay đổi tình hình. Bước đầu tiên là chọn một trong hai SDG này, sau đó chỉnh CTA cho cụ thể hơn. Trong cả hai trường hợp, các em đang đi đúng hướng để phát triển đoạn văn, nhưng chưa thể làm tiếp vì CTA vẫn chưa đúng hoặc còn quá rộng. Các em cần chọn một trong hai hướng đó."),
    ("01:20-02:08", "Giảng viên", "Câu hỏi của thầy là: trong hai hướng này, hướng nào thực sự khiến các em hứng thú? Hướng nào làm các em cảm thấy đây là điều quan trọng với bản thân, hoặc khiến các em nghĩ: 'Ồ, điều này thật sự thú vị'? Thầy sẽ không quyết định thay các em. Nhóm của các em có bao nhiêu thành viên?"),
    ("01:43-01:48", "Sinh viên", "Chỉ hai người bọn em thôi ạ."),
    ("01:48-02:15", "Giảng viên", "Thầy nghĩ hai em phải tự quyết định xem hướng nào khiến cả hai thực sự hứng thú và có đam mê, vì đây sẽ là một dự án khó và các em cần sự quan tâm cá nhân đó để có động lực làm tốt, đúng không?"),
    ("02:15-02:18", "Sinh viên", "Vâng ạ."),
    ("02:18-02:51", "Giảng viên", "Vậy một CTA tốt là gì? Một CTA tốt phải có mục tiêu rõ và thực tế, đồng thời là điều mà người dùng có thể làm được. Ngay cả khi CTA chính không phải là việc người dùng có thể làm ngay sau khi xem website, thì bước đầu tiên của CTA phải là việc họ có thể làm ngay, trong ngày hôm đó, hoặc trong tuần đó. Người dùng phải hiểu thật rõ mình cần làm gì."),
    ("02:51-03:12", "Giảng viên", "Hãy lấy ý tưởng thứ hai làm ví dụ. Các em có 'tiếp cận thực phẩm' và 'tiếp cận...' Trước hết, đây không phải là hai khía cạnh riêng biệt. Khía cạnh chính là thực phẩm - cụ thể hơn là thực phẩm đáp ứng nhu cầu dinh dưỡng. Nhưng 'tiếp cận' không phải là một CTA."),
    ("03:12-03:47", "Giảng viên", "Bên dưới, các em viết 'Công nhận thực phẩm dinh dưỡng là một quyền con người'. Câu này có hình thức của một CTA vì nó giống như một mệnh lệnh: 'Hãy làm đi. Hãy làm việc này.' Nhưng đáng tiếc, đó chưa thực sự là điều mà người dùng có thể hành động. 'Công nhận' nghĩa là gì? Nếu tôi công nhận thực phẩm dinh dưỡng là một quyền con người thì tôi phải làm gì? Nếu tôi công nhận sức mạnh của dinh dưỡng trong việc khai mở tiềm năng con người thì tôi phải làm gì?"),
    ("03:47-04:19", "Giảng viên", "Thay vì nói 'Công nhận sức mạnh của dinh dưỡng', các em có thể nói: 'Hãy kiểm tra tủ lạnh và vứt bỏ đồ ăn không lành mạnh.' Hoặc: 'Hãy xem trong tủ bếp, xác định mình đang thiếu những nhóm dinh dưỡng nào, rồi đi siêu thị mua các loại thực phẩm giàu dinh dưỡng đó.'"),
    ("04:19-05:45", "Giảng viên", "Hoặc các em có thể nói: 'Cung cấp vitamin cho mọi trẻ em đi học mỗi ngày.' Vào đầu ngày, hãy cho mỗi em một hộp sữa chua và một viên vitamin tổng hợp để cải thiện dinh dưỡng. Thầy không đề xuất chính sách này, nhưng giả sử các em muốn nói với Chính phủ Việt Nam rằng mỗi trẻ em cần một bát sữa chua và một viên vitamin tổng hợp vào đầu mỗi ngày. Nếu đó là lời kêu gọi hành động - nếu đó là điều các em muốn chính phủ thực hiện - thì với tư cách là người dùng, các em đang nói tôi phải làm gì? Kế hoạch là cung cấp sữa chua và vitamin cho học sinh mỗi ngày, nhưng tôi không thể tự làm việc đó. Vậy tôi phải làm gì?"),
    ("05:45-06:28", "Giảng viên", "Có thể các em muốn tôi viết thư cho đại diện hội đồng thành phố để đề nghị họ xem xét chính sách này và thúc đẩy nó lên chính phủ quốc gia. Có thể ở mỗi thành phố hoặc khu dân cư tại Việt Nam có một đại diện nào đó của Đảng Cộng sản ở từng quận/huyện. Các em có thể tiếp cận đại diện đó và đề xuất ý tưởng, hoặc tìm một kênh khác để trình bày. Các em có thể muốn tập hợp sự ủng hộ, hoặc nói rằng cần nghiên cứu thêm. Các em có thể nói với RMIT: 'Hãy bắt đầu một dự án nghiên cứu.' Điều đó có thể là đề nghị các nhà nghiên cứu đại học nghiên cứu chế độ dinh dưỡng lý tưởng cho học sinh ở Việt Nam, hoặc tập trung vào dinh dưỡng của người cao tuổi và khởi động một chương trình hỗ trợ họ. Có rất nhiều khả năng. Vấn đề này quá lớn nên chúng ta không biết phải làm gì; vì vậy các em cần làm nó thật cụ thể để mọi người biết chính xác mình cần làm gì. Như vậy có dễ hiểu không?"),
    ("06:28-07:23", "Sinh viên", "Giả sử CTA của bọn em là sử dụng tác phẩm nghệ thuật - để người xem dùng tác phẩm trên website của bọn em và đăng lên mạng xã hội như một cách thể hiện hoặc phản đối vấn đề nạn đói và những người đang bị đói. Đó có phải là một CTA tốt không ạ?"),
    ("07:23-07:32", "Giảng viên", "Điều đó có thể chấp nhận được nếu website của các em tạo ra một tác phẩm nghệ thuật thú vị để người dùng lấy và đăng lên mạng xã hội. CTA của các em sẽ là: 'Hãy đăng nội dung này lên mạng xã hội ngay hôm nay để nâng cao nhận thức.' Như vậy là được. Các em cũng có thể làm điều tương tự với vấn đề AIDS/HIV, đúng không?"),
    ("07:32-07:34", "Sinh viên", "Vâng ạ."),
    ("07:34-08:19", "Giảng viên", "Mỗi người trong nhóm có thể khám phá một cách tiếp cận khác nhau. Ý tưởng trên màn hình cho thấy các em có một trực giác khá thú vị: chia CTA thành hai phần, để một người trong nhóm làm Phần A và người còn lại làm Phần B. Một cách khác là chia phần kể chuyện dẫn đến CTA: một người giải thích Điểm A, người kia giải thích Điểm B, và cả hai cùng hướng đến một CTA. Có rất nhiều cách để cấu trúc công việc. Còn câu hỏi nào khác không?"),
    ("08:19-08:51", "Sinh viên", "Thực ra bọn em có một SDG khác muốn hướng đến. Bọn em đang nghĩ về kiến trúc và sinh thái - sử dụng kiến trúc kết hợp với cây cối và thực vật - và CTA của bọn em là..."),
    ("08:51-09:26", "Giảng viên", "Để thầy dừng các em ở đây. Có rất nhiều nhóm trong lớp thầy đã làm ý tưởng đó rồi. Hãy nhớ rằng một trong những mục tiêu của các em là phải sáng tạo và nghĩ ra một ý tưởng khác biệt mà chưa ai nghĩ đến. Thầy không nói SDG đó là sai - chúng ta có 17 SDG, và chắc chắn mỗi người sẽ từng làm về một SDG nào đó. Nhưng mục tiêu của các em là tạo ra một ý tưởng sáng tạo, nổi bật, mà người khác chưa nghĩ tới. Điều các em vừa nói gần như là ý tưởng dễ nghĩ ra nhất mà nhiều người đưa ra trong lần động não đầu tiên. Các em cần đào sâu hơn và nghĩ ra một ý tưởng sáng tạo hơn nhiều."),
    ("09:26-09:40", "Giảng viên và Sinh viên", "Giảng viên: Em còn câu hỏi nào không? Sinh viên: Không ạ, em nghĩ vậy là hết rồi. Vâng, em nghĩ vậy là hết rồi."),
    ("09:40-10:48", "Giảng viên", "Sau buổi gặp này, các em nên nhanh chóng trao đổi ngắn với nhau và chọn một trong các hướng đó. Sau đó, hôm nay khi đến lớp, các em sẽ làm bài phát triển kỹ năng. Ngay lập tức, các em nên nghĩ: mình có thể áp dụng những thử nghiệm này như thế nào để tạo ra một thứ gì đó sáng tạo? Ở Bài tập 1, các em không cần phải thống nhất về mặt hình ảnh. Các em có thể đưa ra bất kỳ ý tưởng sáng tạo nào. Mục tiêu là phải sáng tạo, thú vị và gây bất ngờ - các em đang cố làm thầy bất ngờ. Trong tuần tới, hãy đẩy các thử nghiệm đó đi xa nhất có thể. Nếu mỗi người có thể trình bày một thử nghiệm A và một thử nghiệm B thì tốt nhất. Ý tưởng là tìm kiếm sự đa dạng của những ý tưởng thú vị, sâu sắc và sáng tạo."),
    ("10:48-11:19", "Giảng viên", "Các thử nghiệm chỉ cần có tính tạo sinh. Không cần phải có hoạt ảnh và cũng chưa cần nghĩ đến tính tương tác. Chúng cần sâu sắc và sáng tạo. Thầy nhấn mạnh thêm một lần nữa: trong ngày hôm nay, các em cần xác định được SDG, mục tiêu cụ thể và lời kêu gọi hành động cụ thể - càng cụ thể càng tốt. Hãy thu hẹp phạm vi và làm cho nó thật cụ thể."),
    ("11:19-11:40", "Giảng viên", "Thầy nghĩ việc các em đến tư vấn là rất tốt. Thầy mừng vì chúng ta đã phát hiện ra vấn đề cụ thể này ngay bây giờ. Mục tiêu của các em là sửa nó trong ngày hôm nay và quay lại đúng tiến độ để hoàn thành Bài tập 1. Hẹn gặp các em ở lớp chiều nay."),
    ("11:40-11:52", "Sinh viên / Giảng viên", "Sinh viên: Vâng ạ, cảm ơn thầy. Cảm ơn thầy. Tạm biệt thầy. Giảng viên: Tạm biệt. Được rồi, tạm biệt. Hẹn gặp lại. Sinh viên: Em cảm ơn thầy."),
]


def styles():
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle("TitleCustom", parent=base["Title"], fontName="ArialBold", fontSize=25, leading=31, alignment=TA_CENTER, textColor=colors.HexColor("#17324D"), spaceAfter=12),
        "subtitle": ParagraphStyle("SubtitleCustom", parent=base["Normal"], fontName="ArialUnicode", fontSize=11.5, leading=17, alignment=TA_CENTER, textColor=colors.HexColor("#536273"), spaceAfter=7),
        "h1": ParagraphStyle("H1Custom", parent=base["Heading1"], fontName="ArialBold", fontSize=17, leading=22, textColor=colors.HexColor("#17324D"), spaceBefore=7, spaceAfter=10),
        "meta": ParagraphStyle("MetaCustom", parent=base["Normal"], fontName="ArialUnicode", fontSize=10.5, leading=16, textColor=colors.HexColor("#334155"), alignment=TA_CENTER),
        "note": ParagraphStyle("NoteCustom", parent=base["Normal"], fontName="ArialUnicode", fontSize=9.5, leading=14, textColor=colors.HexColor("#475569"), backColor=colors.HexColor("#F1F5F9"), borderColor=colors.HexColor("#CBD5E1"), borderWidth=0.5, borderPadding=8, spaceBefore=12, spaceAfter=14),
        "turn": ParagraphStyle("TurnCustom", parent=base["Normal"], fontName="ArialUnicode", fontSize=10.2, leading=15.2, textColor=colors.HexColor("#1F2937"), spaceAfter=9),
        "speaker": ParagraphStyle("SpeakerCustom", parent=base["Normal"], fontName="ArialBold", fontSize=10.2, leading=15.2, textColor=colors.HexColor("#0F5B78"), spaceAfter=0),
        "time": ParagraphStyle("TimeCustom", parent=base["Normal"], fontName="ArialUnicode", fontSize=8.8, leading=12, textColor=colors.HexColor("#64748B"), spaceAfter=2),
        "small": ParagraphStyle("SmallCustom", parent=base["Normal"], fontName="ArialUnicode", fontSize=8.8, leading=13, textColor=colors.HexColor("#64748B")),
    }


def esc(text):
    return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def footer(canvas, doc):
    canvas.saveState()
    width, _ = A4
    canvas.setStrokeColor(colors.HexColor("#D9E2EC"))
    canvas.setLineWidth(0.5)
    canvas.line(18 * mm, 14 * mm, width - 18 * mm, 14 * mm)
    canvas.setFont("ArialUnicode", 8)
    canvas.setFillColor(colors.HexColor("#64748B"))
    canvas.drawString(18 * mm, 9 * mm, "Spec 1 consultation 1 - consultation transcript")
    canvas.drawRightString(width - 18 * mm, 9 * mm, f"{doc.page}")
    canvas.restoreState()


def make_pdf(path, title, subtitle, data, note):
    st = styles()
    doc = BaseDocTemplate(
        str(path), pagesize=A4, leftMargin=20 * mm, rightMargin=20 * mm, topMargin=18 * mm, bottomMargin=20 * mm,
        title=title, author="OpenAI Codex",
    )
    frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="normal")
    doc.addPageTemplates([PageTemplate(id="main", frames=[frame], onPage=footer)])

    story = [Spacer(1, 35 * mm), Paragraph(esc(title), st["title"]), Paragraph(esc(subtitle), st["subtitle"]), Spacer(1, 8 * mm)]
    is_vi = title.startswith("Bản dịch")
    info = [
        [Paragraph("Nguồn" if is_vi else "Source", st["small"]), Paragraph("Spec 1 consultation 1.m4a", st["small"])],
        [Paragraph("Thời lượng" if is_vi else "Length", st["small"]), Paragraph("Khoảng 12 phút 35 giây" if is_vi else "Approximately 12 minutes 35 seconds", st["small"])],
        [Paragraph("Ngôn ngữ" if is_vi else "Language", st["small"]), Paragraph("Tiếng Anh" if is_vi else "English", st["small"])],
    ]
    table = Table(info, colWidths=[32 * mm, 105 * mm], hAlign="CENTER")
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
        ("INNERGRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#E2E8F0")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 8), ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 6), ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    story += [table, Spacer(1, 14 * mm), Paragraph(esc(note), st["note"]), PageBreak(), Paragraph(esc("Transcript"), st["h1"])]

    for time, speaker, text in data:
        story.append(Paragraph(esc(time), st["time"]))
        story.append(Paragraph(f"{esc(speaker)}: ", st["speaker"]) if False else Paragraph(f"<font name='ArialBold' color='#0F5B78'>{esc(speaker)}:</font> {esc(text)}", st["turn"]))

    doc.build(story)


note_en = "Editorial note: This is a lightly cleaned transcript for readability. Punctuation, repeated fillers, and clear speech-recognition errors were corrected; CTA and SDG terminology was normalized. The repeated background/noise after the consultation ends was omitted."
note_vi = "Ghi chú biên tập: Đây là bản chép lời đã được làm sạch nhẹ để dễ đọc. Dấu câu, từ đệm lặp lại và các lỗi nhận diện giọng nói rõ ràng đã được chỉnh; thuật ngữ CTA và SDG được chuẩn hóa. Phần âm thanh nền/lặp lại sau khi buổi tư vấn kết thúc đã được lược bỏ."

make_pdf(OUT / "Spec_1_consultation_script_EN.pdf", "Consultation Script", "Spec 1 - Assignment One consultation", ENGLISH, note_en)
make_pdf(OUT / "Spec_1_consultation_translation_VI.pdf", "Bản dịch buổi consultation", "Spec 1 - Bài tập 1", VIETNAMESE, note_vi)
print(OUT / "Spec_1_consultation_script_EN.pdf")
print(OUT / "Spec_1_consultation_translation_VI.pdf")
