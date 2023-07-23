import os
from typing import List
from langchain.docstore.document import Document
from langchain.text_splitter import MarkdownHeaderTextSplitter


def load_mdx_files(directory_path:os.PathLike) -> List[Document]:
    """
    Recursively goes through the provided path and process every
    .mdx file. Files are loaded & chunked.
    Parameters:
        directory_path(os.PathLike): The directory containing your mdx files
    Returns:
        List[str]: a list of all the chunks as documents ready for embedding.
    """
    docs: List[str] = []
    headers_to_split_on = [
        ("#", "Header 1"),
        ("##", "Header 2"),
        ("###", "Header 3"),
    ]
    splitter = MarkdownHeaderTextSplitter(headers_to_split_on=headers_to_split_on)
    for root, _, files in os.walk(directory_path):
        for file in files:
            if file.endswith(".mdx"):
                mdx_file_path = os.path.join(root, file)
                print(f"Now chunking {mdx_file_path}")
                with open(mdx_file_path, "r", encoding="utf-8") as f:
                    mdx_content = f.read()
                    docs += (splitter.split_text(mdx_content))
                
    return docs

# Do you think a stackOverflow search could also be helpful?
# Could also do the source code of the whole website with smth like
# https://python.langchain.com/docs/modules/data_connection/document_loaders/integrations/source_code