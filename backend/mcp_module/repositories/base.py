from abc import ABC, abstractmethod
from typing import TypeVar, Generic, List, Optional

T = TypeVar('T')


class Repository(ABC, Generic[T]):
    @abstractmethod
    async def find_by_id(self, entity_id: str) -> Optional[T]:
        pass
    
    @abstractmethod
    async def find_all(self) -> List[T]:
        pass 